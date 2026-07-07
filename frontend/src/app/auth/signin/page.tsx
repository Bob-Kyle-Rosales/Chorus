"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { api, ApiError } from "@/lib/api"
import { useAuthStore } from "@/lib/auth-store"

export default function SignInPage() {
  const router = useRouter()
  const setAuth = useAuthStore((s) => s.setAuth)

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const data = await api.post<{ access_token: string }>("/auth/login", {
        email,
        password,
      })
      useAuthStore.setState({ accessToken: data.access_token })
      const user = await api.get<{
        id: string
        first_name: string
        last_name: string
        email: string
      }>("/auth/me")
      setAuth(user, data.access_token)
      router.push("/home")
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center p-6"
      style={{ background: "var(--chorus-bg)" }}
    >
      {/* Wordmark */}
      <Link
        href="/"
        className="mb-8 text-2xl tracking-wide transition-opacity hover:opacity-70"
        style={{ fontFamily: "var(--font-heading)", color: "var(--chorus-text)" }}
      >
        Chorus
      </Link>

      {/* Card */}
      <div
        className="w-full max-w-sm rounded"
        style={{
          background: "var(--chorus-surface)",
          border: "1px solid var(--chorus-border)",
          borderTop: "2px solid var(--chorus-gold)",
        }}
      >
        <div className="space-y-6 p-8">
          <div>
            <h1
              className="text-xl font-medium"
              style={{ fontFamily: "var(--font-heading)", color: "var(--chorus-text)" }}
            >
              Sign in
            </h1>
            <p className="mt-1 text-sm" style={{ color: "var(--chorus-muted)" }}>
              Welcome back
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="font-mono text-xs tracking-widest uppercase"
                style={{ color: "var(--chorus-muted)" }}
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                autoFocus
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email Address"
                className="w-full rounded px-4 py-2.5 text-sm transition-colors outline-none"
                style={{
                  background: "var(--chorus-bg)",
                  border: "1px solid var(--chorus-border)",
                  color: "var(--chorus-text)",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "var(--chorus-gold)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "var(--chorus-border)")}
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="font-mono text-xs tracking-widest uppercase"
                style={{ color: "var(--chorus-muted)" }}
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded px-4 py-2.5 pr-14 text-sm transition-colors outline-none"
                  style={{
                    background: "var(--chorus-bg)",
                    border: "1px solid var(--chorus-border)",
                    color: "var(--chorus-text)",
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "var(--chorus-gold)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "var(--chorus-border)")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute top-1/2 right-3 -translate-y-1/2 text-xs transition-opacity hover:opacity-80"
                  style={{ color: "var(--chorus-muted)" }}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {error && (
              <p className="rounded border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded py-2.5 text-sm font-medium transition-opacity disabled:opacity-50"
              style={{ background: "var(--chorus-gold)", color: "var(--chorus-bg)" }}
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="text-center text-sm" style={{ color: "var(--chorus-muted)" }}>
            No account?{" "}
            <Link
              href="/auth/signup"
              className="transition-opacity hover:opacity-80"
              style={{ color: "var(--chorus-gold)" }}
            >
              Create one
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}
