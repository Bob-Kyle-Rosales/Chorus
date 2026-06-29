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
      // Fetch user profile with the new token — store it temporarily so
      // the api wrapper can attach the Authorization header for /auth/me
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
          <p className="text-sm text-white/40">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-xs tracking-wider text-white/50 uppercase">
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
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="text-center text-sm text-white/30">
          No account?{" "}
          <Link href="/auth/signup" className="text-white/60 transition-colors hover:text-white">
            Create one
          </Link>
        </p>
      </div>
    </main>
  )
}
