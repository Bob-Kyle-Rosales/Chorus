"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";

export default function SignInPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const data = await api.post<{ access_token: string }>("/auth/login", {
        email,
        password,
      });
      // Fetch user profile with the new token — store it temporarily so
      // the api wrapper can attach the Authorization header for /auth/me
      useAuthStore.setState({ accessToken: data.access_token });
      const user = await api.get<{ id: string; first_name: string; last_name: string; email: string }>("/auth/me");
      setAuth(user, data.access_token);
      router.push("/home");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-1">
          <Link
            href="/"
            className="text-2xl font-bold tracking-tight hover:opacity-80 transition-opacity"
          >
            Chorus
          </Link>
          <p className="text-white/40 text-sm">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="email"
              className="text-xs text-white/50 uppercase tracking-wider"
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
              placeholder="you@example.com"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-white/20 text-sm"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="password"
              className="text-xs text-white/50 uppercase tracking-wider"
            >
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
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-white/20 text-sm"
            />
          </div>

          {error && (
            <p className="text-sm text-red-400 border border-red-500/20 bg-red-500/5 rounded-xl px-4 py-3">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-zinc-950 font-semibold py-3 rounded-xl hover:bg-white/90 disabled:opacity-40 transition-colors text-sm"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="text-center text-sm text-white/30">
          No account?{" "}
          <Link
            href="/auth/signup"
            className="text-white/60 hover:text-white transition-colors"
          >
            Create one
          </Link>
        </p>
      </div>
    </main>
  );
}
