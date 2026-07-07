"use client"

import { useState } from "react"

interface FollowUpInputProps {
  onSubmit: (question: string) => void
  runStatus: "idle" | "running" | "complete" | "error"
  followUpStatus: "idle" | "submitting" | "active"
  credits: number
}

export function FollowUpInput({
  onSubmit,
  runStatus,
  followUpStatus,
  credits,
}: FollowUpInputProps) {
  const [value, setValue] = useState("")

  const isLocked = runStatus === "running" || followUpStatus !== "idle"
  const hasCredits = credits > 0
  const canSubmit = !isLocked && hasCredits && value.trim().length > 0

  const placeholder = isLocked
    ? "Research in progress…"
    : !hasCredits
      ? "Credits reset tomorrow at midnight UTC"
      : "Ask a follow-up…"

  function handleSubmit() {
    if (!canSubmit) return
    const q = value.trim()
    setValue("")
    onSubmit(q)
  }

  return (
    <div
      className="shrink-0 px-6 py-4"
      style={{
        borderTop: "1px solid var(--chorus-border)",
        background: "var(--chorus-bg)",
      }}
    >
      <div className="mx-auto flex max-w-4xl gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) handleSubmit()
          }}
          disabled={isLocked || !hasCredits}
          placeholder={placeholder}
          className="flex-1 rounded px-4 py-2.5 text-sm outline-none transition-opacity disabled:opacity-40"
          style={{
            background: "var(--chorus-surface)",
            border: "1px solid var(--chorus-border)",
            color: "var(--chorus-text)",
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = "var(--chorus-gold)")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "var(--chorus-border)")}
        />
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          aria-label="Send follow-up"
          className="shrink-0 rounded px-4 py-2.5 text-sm transition-opacity disabled:opacity-25"
          style={{ background: "var(--chorus-gold)", color: "var(--chorus-bg)" }}
        >
          {followUpStatus === "submitting" ? (
            <span
              className="block h-4 w-4 animate-spin rounded-full border-2"
              style={{ borderColor: "rgba(13,20,32,0.3)", borderTopColor: "var(--chorus-bg)" }}
            />
          ) : (
            "→"
          )}
        </button>
      </div>
    </div>
  )
}
