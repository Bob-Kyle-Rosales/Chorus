"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSessionStore } from "@/lib/store"
import { useAuthStore } from "@/lib/auth-store"
import { api } from "@/lib/api"
import { useRouter } from "next/navigation"
import { PlusCircle, LogOut } from "lucide-react"
import { CreditCounter } from "@/components/CreditCounter"
import type { Session } from "@/types/events"

function formatDate(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return "Today"
  if (diffDays === 1) return "Yesterday"
  if (diffDays < 7) return `${diffDays} days ago`
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function SessionEntry({
  session,
  active,
  isRunning,
}: {
  session: Session
  active: boolean
  isRunning: boolean
}) {
  return (
    <Link
      href={`/run/${session.id}?q=${encodeURIComponent(session.question)}`}
      className={`group block rounded-lg px-3 py-2.5 transition-colors ${
        active ? "bg-white/10 text-white" : "text-white/50 hover:bg-white/5 hover:text-white/80"
      }`}
    >
      <div className="flex items-start gap-2">
        {/* Pulsing amber dot — visible only while a WebSocket is active for this session */}
        {isRunning && (
          <span className="mt-1 block h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-amber-400" />
        )}
        <p className="line-clamp-2 text-xs leading-snug font-medium">
          {session.name ?? session.question}
        </p>
      </div>
      <p className="mt-1 pl-3.5 text-[10px] text-white/25">{formatDate(session.last_active)}</p>
    </Link>
  )
}

export function SessionSidebar() {
  const router = useRouter()
  const pathname = usePathname()
  const { sessions, credits, activeConnections } = useSessionStore()
  const { clearAuth, user } = useAuthStore()

  async function handleLogout() {
    await api.post("/auth/logout").catch(() => {})
    clearAuth()
    router.replace("/")
  }

  // Derive the active session ID from the current URL (/run/[id])
  const activeId = pathname.startsWith("/run/") ? pathname.split("/")[2] : null

  return (
    <aside className="sticky top-0 flex h-screen w-56 shrink-0 flex-col border-r border-white/5 bg-zinc-950">
      {/* Header */}
      <div className="border-b border-white/5 px-4 py-4">
        <Link
          href="/home"
          className="text-sm font-bold tracking-tight transition-opacity hover:opacity-80"
        >
          Chorus
        </Link>
      </div>

      {/* New Research button */}
      <div className="px-3 py-3">
        <Link
          href="/home"
          className="flex w-full items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs text-white/50 transition-colors hover:text-white/80"
        >
          <PlusCircle className="h-3.5 w-3.5" />
          New research
        </Link>
      </div>

      {/* Session list */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-1">
        {sessions.length === 0 ? (
          <p className="px-3 py-4 text-center text-[11px] leading-relaxed text-white/20">
            Your research sessions will appear here
          </p>
        ) : (
          sessions.map((s) => (
            <SessionEntry
              key={s.id}
              session={s}
              active={s.id === activeId}
              isRunning={Boolean(activeConnections[s.id])}
            />
          ))
        )}
      </nav>

      {/* Footer: user name, credits, logout */}
      <div className="space-y-2 border-t border-white/5 px-4 py-3">
        {user && (
          <p className="truncate text-[11px] text-white/40">
            {user.first_name} {user.last_name}
          </p>
        )}
        <CreditCounter credits={credits} showLabel />
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-1.5 text-[11px] text-white/25 transition-colors hover:text-white/50"
        >
          <LogOut className="h-3 w-3" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
