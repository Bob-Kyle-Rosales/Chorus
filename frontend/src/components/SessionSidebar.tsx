"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useSessionStore } from "@/lib/store"
import { useAuthStore } from "@/lib/auth-store"
import { api } from "@/lib/api"
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
  onRename,
  onDelete,
}: {
  session: Session
  active: boolean
  isRunning: boolean
  onRename: (id: string, name: string) => void
  onDelete: (id: string) => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(session.name ?? session.question)
  const inputRef = useRef<HTMLInputElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Focus the rename input as soon as it appears
  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [menuOpen])

  function startRename() {
    setMenuOpen(false)
    setEditValue(session.name ?? session.question)
    setEditing(true)
  }

  function commitRename() {
    const name = editValue.trim()
    setEditing(false)
    if (name && name !== (session.name ?? session.question)) {
      onRename(session.id, name)
    }
  }

  return (
    <div
      className="group relative"
      style={
        active
          ? {
              borderLeft: "2px solid var(--chorus-gold)",
              background: "var(--chorus-surface)",
            }
          : { borderLeft: "2px solid transparent" }
      }
    >
      {editing ? (
        <div className="px-3 py-2">
          <input
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename()
              if (e.key === "Escape") setEditing(false)
            }}
            onBlur={commitRename}
            className="w-full rounded px-2 py-1 text-xs outline-none"
            style={{
              background: "var(--chorus-bg)",
              border: "1px solid var(--chorus-gold)",
              color: "var(--chorus-text)",
            }}
          />
        </div>
      ) : (
        <Link
          href={`/run/${session.id}?q=${encodeURIComponent(session.question)}`}
          className="flex items-start gap-2 px-3 py-2.5 transition-colors"
          style={{ color: active ? "var(--chorus-text)" : "var(--chorus-muted)" }}
        >
          {isRunning && (
            <span
              className="mt-1 block h-1.5 w-1.5 shrink-0 animate-pulse rounded-full"
              style={{ background: "var(--chorus-gold)" }}
            />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs leading-snug">
              {session.name ?? session.question}
            </p>
            <p
              className="mt-0.5 text-[10px]"
              style={{ color: "var(--chorus-border)" }}
            >
              {formatDate(session.last_active)}
            </p>
          </div>
        </Link>
      )}

      {/* Three-dot menu button — visible on hover */}
      {!editing && (
        <button
          onClick={(e) => {
            e.preventDefault()
            setMenuOpen((v) => !v)
          }}
          className="absolute top-2 right-2 hidden rounded px-1 py-0.5 text-xs opacity-60 transition-opacity hover:opacity-100 group-hover:block"
          style={{ color: "var(--chorus-muted)", background: "var(--chorus-surface)" }}
          aria-label="Session options"
        >
          ···
        </button>
      )}

      {/* Context menu */}
      {menuOpen && (
        <div
          ref={menuRef}
          className="absolute top-8 right-2 z-50 w-32 rounded py-1 shadow-lg"
          style={{
            background: "var(--chorus-surface)",
            border: "1px solid var(--chorus-border)",
          }}
        >
          <button
            onClick={startRename}
            className="w-full px-3 py-1.5 text-left text-xs transition-colors hover:opacity-80"
            style={{ color: "var(--chorus-text)" }}
          >
            Rename
          </button>
          <button
            onClick={() => {
              setMenuOpen(false)
              onDelete(session.id)
            }}
            className="w-full px-3 py-1.5 text-left text-xs transition-colors hover:opacity-80"
            style={{ color: "#ef4444" }}
          >
            Delete
          </button>
        </div>
      )}
    </div>
  )
}

export function SessionSidebar() {
  const router = useRouter()
  const pathname = usePathname()
  const { sessions, credits, activeConnections, setSessions, updateSessionName } =
    useSessionStore()
  const { clearAuth, user } = useAuthStore()

  const activeId = pathname.startsWith("/run/") ? pathname.split("/")[2] : null

  async function handleLogout() {
    await api.post("/auth/logout").catch(() => {})
    clearAuth()
    router.replace("/")
  }

  async function handleRename(id: string, name: string) {
    updateSessionName(id, name)
    api.patch(`/sessions/${id}/name`, { name }).catch(() => {})
  }

  async function handleDelete(id: string) {
    setSessions(sessions.filter((s) => s.id !== id))
    api.delete(`/sessions/${id}`).catch(() => {})
    if (activeId === id) router.replace("/home")
  }

  return (
    <aside
      className="sticky top-0 flex h-screen w-60 shrink-0 flex-col"
      style={{
        background: "var(--chorus-bg)",
        borderRight: "1px solid var(--chorus-border)",
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-4"
        style={{ borderBottom: "1px solid var(--chorus-border)" }}
      >
        <Link
          href="/home"
          className="text-lg tracking-wide transition-opacity hover:opacity-70"
          style={{ fontFamily: "var(--font-heading)", color: "var(--chorus-text)" }}
        >
          Chorus
        </Link>
      </div>

      {/* New research */}
      <div className="px-3 py-3">
        <Link
          href="/home"
          className="flex w-full items-center gap-2 rounded px-3 py-2 text-xs transition-colors hover:opacity-80"
          style={{
            border: "1px solid var(--chorus-border)",
            color: "var(--chorus-muted)",
          }}
        >
          <span style={{ color: "var(--chorus-gold)" }}>+</span>
          New research
        </Link>
      </div>

      {/* Session list */}
      <nav className="flex-1 overflow-y-auto py-1">
        {sessions.length === 0 ? (
          <p
            className="px-4 py-6 text-center text-[11px] leading-relaxed"
            style={{ color: "var(--chorus-border)" }}
          >
            Your research sessions will appear here
          </p>
        ) : (
          sessions.map((s) => (
            <SessionEntry
              key={s.id}
              session={s}
              active={s.id === activeId}
              isRunning={Boolean(activeConnections[s.id])}
              onRename={handleRename}
              onDelete={handleDelete}
            />
          ))
        )}
      </nav>

      {/* User footer */}
      <div
        className="space-y-3 px-4 py-4"
        style={{ borderTop: "1px solid var(--chorus-border)" }}
      >
        {user && (
          <p className="truncate text-xs" style={{ color: "var(--chorus-muted)" }}>
            {user.first_name} {user.last_name}
          </p>
        )}
        <p className="font-mono text-xs" style={{ color: "var(--chorus-gold)" }}>
          {credits} ◉
        </p>
        <button
          onClick={handleLogout}
          className="text-xs transition-colors hover:opacity-80"
          style={{ color: "var(--chorus-border)" }}
        >
          Sign out
        </button>
      </div>
    </aside>
  )
}
