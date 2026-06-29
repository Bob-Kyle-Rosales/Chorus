"use client"

// Layout for all routes inside the (research) route group.
//
// Two responsibilities:
//   1. Auth guard — checks for a valid access token on every mount.
//      If the token is missing (e.g. after page refresh), tries a silent
//      refresh using the httpOnly cookie. Redirects to /auth/signin on failure.
//   2. Shell — renders the sidebar + main content split once auth passes.
//      The SessionSidebar is always visible across /home and /run/[id].
//      Sessions are fetched here once and put in the Zustand store so every
//      child page can read them without its own fetch.

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/lib/auth-store"
import { useSessionStore } from "@/lib/store"
import { api } from "@/lib/api"
import { SessionSidebar } from "@/components/SessionSidebar"
import type { Session } from "@/types/events"

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"

export default function ResearchLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { accessToken, setAuth, clearAuth } = useAuthStore()
  const { setSessions, setCredits } = useSessionStore()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    async function init() {
      let token = accessToken

      // No token in memory — page was refreshed. Attempt silent refresh.
      if (!token) {
        try {
          const res = await fetch(`${API_BASE}/auth/refresh`, {
            method: "POST",
            credentials: "include",
          })
          if (!res.ok) throw new Error()
          const { access_token } = await res.json()
          // Temporarily write token so api.get can attach it
          useAuthStore.setState({ accessToken: access_token })
          token = access_token
          const user = await api.get<{ id: string; first_name: string; last_name: string; email: string }>("/auth/me")
          setAuth(user, access_token)
        } catch {
          clearAuth()
          router.replace("/auth/signin")
          return
        }
      }

      // Auth confirmed — fetch sessions + credit balance in parallel
      await Promise.allSettled([
        api.get<Session[]>("/sessions").then(setSessions),
        api.get<{ balance: number }>("/credits").then(({ balance }) => setCredits(balance)),
      ])

      setChecking(false)
    }

    init()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (checking) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-white/20 text-sm font-mono animate-pulse">Loading...</div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-zinc-950 text-white overflow-hidden">
      <SessionSidebar />
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  )
}
