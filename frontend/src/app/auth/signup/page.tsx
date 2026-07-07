"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { api, ApiError } from "@/lib/api"
import { useAuthStore } from "@/lib/auth-store"

export default function SignUpPage() {
  const router = useRouter()
  const setAuth = useAuthStore((s) => s.setAuth)

  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const passwordTooShort = password.length > 0 && password.length < 8
  const confirmMismatch = confirm.length > 0 && password !== confirm

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!firstName.trim() || !lastName.trim()) {
      setError("Please enter your first and last name.")
      return
    }
    if (password !== confirm) {
      setError("Passwords do not match.")
      return
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.")
      return
    }

    setLoading(true)
    try {
      const data = await api.post<{ access_token: string }>("/auth/register", {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
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

  const inputStyle = {
    background: "var(--chorus-bg)",
    border: "1px solid var(--chorus-border)",
    color: "var(--chorus-text)",
  }

  function handleFocus(e: React.FocusEvent<HTMLInputElement>) {
    e.currentTarget.style.borderColor = "var(--chorus-gold)"
  }
  function handleBlur(e: React.FocusEvent<HTMLInputElement>) {
    e.currentTarget.style.borderColor = "var(--chorus-border)"
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
              Create account
            </h1>
            <p className="mt-1 text-sm" style={{ color: "var(--chorus-muted)" }}>
              Free tier — 20 credits per day
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label
                  htmlFor="firstName"
                  className="font-mono text-xs tracking-widest uppercase"
                  style={{ color: "var(--chorus-muted)" }}
                >
                  First name
                </label>
                <input
                  id="firstName"
                  type="text"
                  autoComplete="given-name"
                  autoFocus
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First Name"
                  className="w-full rounded px-4 py-2.5 text-sm outline-none"
                  style={inputStyle}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                />
              </div>
              <div className="space-y-1.5">
                <label
                  htmlFor="lastName"
                  className="font-mono text-xs tracking-widest uppercase"
                  style={{ color: "var(--chorus-muted)" }}
                >
                  Last name
                </label>
                <input
                  id="lastName"
                  type="text"
                  autoComplete="family-name"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last Name"
                  className="w-full rounded px-4 py-2.5 text-sm outline-none"
                  style={inputStyle}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                />
              </div>
            </div>

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
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email Address"
                className="w-full rounded px-4 py-2.5 text-sm outline-none"
                style={inputStyle}
                onFocus={handleFocus}
                onBlur={handleBlur}
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
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full rounded px-4 py-2.5 pr-14 text-sm outline-none"
                  style={inputStyle}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
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
              {passwordTooShort && (
                <p className="text-xs text-destructive">At least 8 characters</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="confirm"
                className="font-mono text-xs tracking-widest uppercase"
                style={{ color: "var(--chorus-muted)" }}
              >
                Confirm password
              </label>
              <div className="relative">
                <input
                  id="confirm"
                  type={showConfirm ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Confirm Password"
                  className="w-full rounded px-4 py-2.5 pr-14 text-sm outline-none"
                  style={inputStyle}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute top-1/2 right-3 -translate-y-1/2 text-xs transition-opacity hover:opacity-80"
                  style={{ color: "var(--chorus-muted)" }}
                >
                  {showConfirm ? "Hide" : "Show"}
                </button>
              </div>
              {confirmMismatch && (
                <p className="text-xs text-destructive">Passwords don&apos;t match</p>
              )}
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
              {loading ? "Creating account…" : "Create account"}
            </button>
          </form>

          <p className="text-center text-sm" style={{ color: "var(--chorus-muted)" }}>
            Already have an account?{" "}
            <Link
              href="/auth/signin"
              className="transition-opacity hover:opacity-80"
              style={{ color: "var(--chorus-gold)" }}
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}
