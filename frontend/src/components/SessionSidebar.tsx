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
      className={`block rounded-lg px-3 py-2.5 transition-colors group ${
        active
          ? "bg-white/10 text-white"
          : "text-white/50 hover:bg-white/5 hover:text-white/80"
      }`}
    >
      <div className="flex items-start gap-2">
        {/* Pulsing amber dot — visible only while a WebSocket is active for this session */}
        {isRunning && (
          <span className="mt-1 shrink-0 block w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
        )}
        <p className="text-xs font-medium leading-snug line-clamp-2">
          {session.name ?? session.question}
        </p>
      </div>
      <p className="text-[10px] text-white/25 mt-1 pl-3.5">{formatDate(session.last_active)}</p>
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
    <aside className="w-56 shrink-0 flex flex-col border-r border-white/5 bg-zinc-950 h-screen sticky top-0">
      {/* Header */}
      <div className="px-4 py-4 border-b border-white/5">
        <Link href="/home" className="text-sm font-bold tracking-tight hover:opacity-80 transition-opacity">
          Chorus
        </Link>
      </div>

      {/* New Research button */}
      <div className="px-3 py-3">
        <Link
          href="/home"
          className="flex items-center gap-2 text-xs text-white/50 hover:text-white/80 border border-white/10 rounded-lg px-3 py-2 transition-colors w-full"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          New research
        </Link>
      </div>

      {/* Session list */}
      <nav className="flex-1 overflow-y-auto px-3 space-y-0.5 py-1">
        {sessions.length === 0 ? (
          <p className="text-[11px] text-white/20 px-3 py-4 text-center leading-relaxed">
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
      <div className="px-4 py-3 border-t border-white/5 space-y-2">
        {user && (
          <p className="text-[11px] text-white/40 truncate">
            {user.first_name} {user.last_name}
          </p>
        )}
        <CreditCounter credits={credits} showLabel />
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-[11px] text-white/25 hover:text-white/50 transition-colors w-full"
        >
          <LogOut className="w-3 h-3" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
