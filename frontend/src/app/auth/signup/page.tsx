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
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

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

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 p-6 text-white">
      <div className="w-full max-w-sm space-y-8">
        <div className="space-y-1 text-center">
          <Link
            href="/"
            className="text-2xl font-bold tracking-tight transition-opacity hover:opacity-80"
          >
            Chorus
          </Link>
          <p className="text-sm text-white/40">Create your free account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name row — side by side */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label htmlFor="firstName" className="text-xs tracking-wider text-white/50 uppercase">
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
                placeholder="Jane"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/20 focus:ring-2 focus:ring-white/20 focus:outline-none"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="lastName" className="text-xs tracking-wider text-white/50 uppercase">
                Last name
              </label>
              <input
                id="lastName"
                type="text"
                autoComplete="family-name"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Doe"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/20 focus:ring-2 focus:ring-white/20 focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="email" className="text-xs tracking-wider text-white/50 uppercase">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/20 focus:ring-2 focus:ring-white/20 focus:outline-none"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-xs tracking-wider text-white/50 uppercase">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/20 focus:ring-2 focus:ring-white/20 focus:outline-none"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="confirm" className="text-xs tracking-wider text-white/50 uppercase">
              Confirm password
            </label>
            <input
              id="confirm"
              type="password"
              autoComplete="new-password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/20 focus:ring-2 focus:ring-white/20 focus:outline-none"
            />
          </div>

          {error && (
            <p className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-white py-3 text-sm font-semibold text-zinc-950 transition-colors hover:bg-white/90 disabled:opacity-40"
          >
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="text-center text-sm text-white/30">
          Already have an account?{" "}
          <Link href="/auth/signin" className="text-white/60 transition-colors hover:text-white">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  )
}
