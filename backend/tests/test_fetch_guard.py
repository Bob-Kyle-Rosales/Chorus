# Tests for the SSRF (Server-Side Request Forgery) guard.
#
# TDD approach — this file is written BEFORE fetch_guard.py exists.
# Run it first to confirm it fails, then implement fetch_guard.py,
# then run again to confirm it passes.
#
# What we're testing:
#   assert_safe_url() must BLOCK private/internal/dangerous URLs
#   assert_safe_url() must ALLOW legitimate public URLs

import pytest
from chorus.security.fetch_guard import assert_safe_url, UnsafeURLError


# ---------------------------------------------------------------------------
# URLs that MUST be blocked
# ---------------------------------------------------------------------------
# @pytest.mark.parametrize runs the same test function once per URL in the list.
# This is cleaner than writing 10 separate test functions.

@pytest.mark.parametrize("url", [
    "http://169.254.169.254/latest/meta-data/",  # AWS/GCP/Azure cloud metadata endpoint
                                                  # fetching this can leak infra credentials
    "http://localhost/",                          # loopback — targets the server itself
    "http://127.0.0.1/",                          # loopback IP — same as localhost
    "http://0.0.0.0/",                            # unspecified address — targets local machine
    "http://10.0.0.5/internal-api",               # private network (10.x.x.x range)
    "http://192.168.1.1/",                        # private network (home/office router)
    "http://172.16.0.1/",                         # private network (172.16-31.x.x range)
    "file:///etc/passwd",                         # local file system access — reads server files
    "gopher://evil.com/",                         # gopher protocol — disallowed scheme
    "ftp://files.internal/",                      # ftp protocol — disallowed scheme
])
def test_blocks_unsafe_urls(url):
    """Every URL in the list above must raise UnsafeURLError."""
    with pytest.raises(UnsafeURLError):
        assert_safe_url(url)


# ---------------------------------------------------------------------------
# URLs that MUST be allowed
# ---------------------------------------------------------------------------

def test_allows_public_https():
    """A real public HTTPS URL must pass validation without raising."""
    assert_safe_url("https://en.wikipedia.org/wiki/Quantum_computing")


def test_allows_public_http():
    """A real public HTTP URL must also pass validation."""
    assert_safe_url("http://example.com/")
