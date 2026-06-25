# fetch_guard.py
# SSRF (Server-Side Request Forgery) protection for the researcher node.
#
# What is SSRF?
#   When the researcher fetches URLs from Tavily search results, a malicious
#   page in those results could point to an internal address like:
#     - http://169.254.169.254/  (AWS/GCP metadata endpoint — leaks credentials)
#     - http://localhost:8000/   (the Chorus server itself)
#     - http://192.168.1.1/     (internal network devices)
#
#   If we fetched those blindly, an attacker could trick the researcher into
#   exfiltrating sensitive data from inside the server's network.
#
# How we prevent it:
#   Before every httpx.get() call in the researcher node, call assert_safe_url().
#   It resolves the hostname to its real IP address(es) and rejects anything
#   that points to a private, loopback, or reserved range.
#
# See: SECURITY.md T3

import ipaddress   # Python's built-in library for working with IP addresses
import socket      # used to resolve hostnames to IP addresses (DNS lookup)
from urllib.parse import urlparse  # splits a URL into its components (scheme, host, path, etc.)


class UnsafeURLError(Exception):
    """
    Raised when a URL fails safety validation.

    Callers should catch this and either skip the URL or send a run.error
    event to the frontend — never silently swallow it.
    """
    pass


def assert_safe_url(url: str) -> None:
    """
    Validates that a URL is safe to fetch before making an HTTP request.

    Performs three checks in order:
      1. Scheme must be http or https
      2. Host must be present in the URL
      3. Every IP address the hostname resolves to must be public

    Args:
        url: the URL string to validate (e.g. "https://example.com/article")

    Returns:
        None — if the function returns without raising, the URL is safe.

    Raises:
        UnsafeURLError: if any check fails. The message explains why.

    Usage in researcher node (Phase 1):
        from chorus.security.fetch_guard import assert_safe_url, UnsafeURLError

        try:
            assert_safe_url(url)
            response = await httpx_client.get(url)
        except UnsafeURLError:
            # skip this URL and continue with the next one
            continue
    """

    # ------------------------------------------------------------------
    # Step 1: Parse the URL into components
    # ------------------------------------------------------------------
    # urlparse("https://example.com/path?q=1") returns:
    #   scheme   = "https"
    #   hostname = "example.com"
    #   path     = "/path"
    #   query    = "q=1"
    parsed = urlparse(url)

    # ------------------------------------------------------------------
    # Step 2: Check the scheme
    # ------------------------------------------------------------------
    # Only http and https are allowed.
    # This blocks:
    #   file://  → reads local server files
    #   gopher:// → obsolete protocol, used in SSRF attacks
    #   ftp://   → file transfer protocol, not needed for web research
    #   data://  → embeds raw data, bypasses network
    if parsed.scheme not in ("http", "https"):
        raise UnsafeURLError(f"Disallowed scheme: {parsed.scheme!r}")

    # ------------------------------------------------------------------
    # Step 3: Ensure the host exists
    # ------------------------------------------------------------------
    # A URL like "http:///path" has no host — urlparse returns None.
    # We must have a host to do a DNS lookup.
    host = parsed.hostname
    if not host:
        raise UnsafeURLError("URL has no host")

    # ------------------------------------------------------------------
    # Step 4: Resolve the hostname and check every IP address
    # ------------------------------------------------------------------
    # socket.getaddrinfo() does a full DNS lookup and returns ALL
    # IP addresses (A and AAAA records) for the hostname.
    #
    # Why check ALL addresses?
    #   A malicious DNS server could return multiple IPs:
    #   one public (to pass the first check) and one private.
    #   We check every single one so none slip through.
    try:
        results = socket.getaddrinfo(host, None)
    except socket.gaierror as e:
        # DNS resolution failed — hostname doesn't exist or can't be reached
        raise UnsafeURLError(f"Could not resolve host {host!r}: {e}")

    for _, _, _, _, sockaddr in results:
        # sockaddr is (ip_string, port) for IPv4 or (ip_string, port, flow, scope) for IPv6
        ip = ipaddress.ip_address(sockaddr[0])

        # Check every dangerous IP category:
        if ip.is_loopback:
            # 127.0.0.0/8 (IPv4) or ::1 (IPv6)
            # Targets the server itself — e.g. http://127.0.0.1:8000/internal
            raise UnsafeURLError(f"Blocked loopback address: {ip}")

        if ip.is_private:
            # 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16
            # Targets internal network devices (databases, other services)
            raise UnsafeURLError(f"Blocked private address: {ip}")

        if ip.is_link_local:
            # 169.254.0.0/16 (IPv4) or fe80::/10 (IPv6)
            # This is the cloud metadata endpoint range — critical to block.
            # http://169.254.169.254/ is used by AWS, GCP, and Azure to expose
            # instance metadata including API keys and IAM credentials.
            raise UnsafeURLError(f"Blocked link-local address: {ip}")

        if ip.is_reserved:
            # Addresses reserved for special purposes (RFC 1918, etc.)
            raise UnsafeURLError(f"Blocked reserved address: {ip}")

        if ip.is_multicast:
            # 224.0.0.0/4 — multicast addresses, not valid for web fetching
            raise UnsafeURLError(f"Blocked multicast address: {ip}")

    # If we reach here, all checks passed — the URL is safe to fetch.
