"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { api, ApiError } from "@/lib/api"
import { useAuthStore } from "@/lib/auth-store"
import { AuthBrandPanel } from "@/components/AuthBrandPanel"

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
    <main className="flex min-h-screen" style={{ background: "var(--chorus-bg)" }}>
      <AuthBrandPanel variant="signin" />

      <div className="flex flex-1 flex-col items-center justify-center p-8">
        <div className="w-full max-w-md space-y-10">
          <Link
            href="/"
            className="block text-3xl tracking-wide transition-opacity hover:opacity-70"
            style={{ fontFamily: "var(--font-heading)", color: "var(--chorus-text)" }}
          >
            Chorus
          </Link>

          <div className="space-y-8">
            <div>
              <h1
                className="text-2xl font-medium"
                style={{ fontFamily: "var(--font-heading)", color: "var(--chorus-text)" }}
              >
                Sign in
              </h1>
              <p className="mt-1.5 text-base" style={{ color: "var(--chorus-muted)" }}>
                Welcome back
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="font-mono text-sm tracking-widest uppercase"
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
                  className="w-full rounded px-5 py-3.5 text-base transition-colors outline-none"
                  style={{
                    background: "var(--chorus-bg)",
                    border: "1px solid var(--chorus-border)",
                    color: "var(--chorus-text)",
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "var(--chorus-gold)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "var(--chorus-border)")}
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="password"
                  className="font-mono text-sm tracking-widest uppercase"
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
                    className="w-full rounded px-5 py-3.5 pr-16 text-base transition-colors outline-none"
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
                    className="absolute top-1/2 right-4 -translate-y-1/2 text-sm transition-opacity hover:opacity-80"
                    style={{ color: "var(--chorus-muted)" }}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              {error && (
                <p className="rounded border border-destructive/30 bg-destructive/10 px-5 py-3.5 text-base text-destructive">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded py-3.5 text-base font-medium transition-opacity disabled:opacity-50"
                style={{ background: "var(--chorus-gold)", color: "var(--chorus-bg)" }}
              >
                {loading ? "Signing in…" : "Sign in"}
              </button>
            </form>

            <p className="text-center text-base" style={{ color: "var(--chorus-muted)" }}>
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
      </div>
    </main>
  )
}
