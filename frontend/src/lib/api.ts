// Typed fetch wrapper for all backend API calls.
//
// Automatically injects the Authorization header when an access token is in
// the auth store. On 401 responses it attempts a token refresh once, then
// retries the original request before giving up.

import { useAuthStore } from "@/lib/auth-store"

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
    this.name = "ApiError"
  }
}

async function tryRefresh(): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      credentials: "include", // sends the httpOnly refresh cookie
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.access_token ?? null
  } catch {
    return null
  }
}

async function request<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
  const { accessToken, setAuth, clearAuth, user } = useAuthStore.getState()

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  }
  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: "include", // always send cookies (needed for refresh)
  })

  if (res.status === 401 && retry) {
    // Access token expired — try to refresh once
    const newToken = await tryRefresh()
    if (newToken && user) {
      setAuth(user, newToken)
      return request<T>(path, options, false) // retry once with new token
    }
    clearAuth()
    throw new ApiError(401, "Session expired. Please sign in again.")
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new ApiError(res.status, body.detail ?? `Request failed: ${res.status}`)
  }

  // 204 No Content — return empty object
  if (res.status === 204) return {} as T

  return res.json() as Promise<T>
}

export const api = {
  get<T>(path: string) {
    return request<T>(path, { method: "GET" })
  },
  post<T>(path: string, body?: unknown) {
    return request<T>(path, {
      method: "POST",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  },
  patch<T>(path: string, body?: unknown) {
    return request<T>(path, {
      method: "PATCH",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  },
}

export { ApiError }
