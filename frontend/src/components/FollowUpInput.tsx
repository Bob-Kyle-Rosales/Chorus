"use client"

import { useState } from "react"
import { ArrowRight } from "lucide-react"

// Always-visible input bar anchored to the bottom of the run page.
// Disabled while any run (original or follow-up pipeline) is active.
// The placeholder text communicates the current state to the user.

interface FollowUpInputProps {
  onSubmit: (question: string) => void
  // Status of the original pipeline run
  runStatus: "idle" | "running" | "complete" | "error"
  // Status of any active follow-up
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
    ? "Research in progress..."
    : !hasCredits
      ? "Credits reset tomorrow at midnight UTC"
      : 'Ask a follow-up, or say "tell me more about finding 2"...'

  function handleSubmit() {
    if (!canSubmit) return
    const q = value.trim()
    setValue("")
    onSubmit(q)
  }

  return (
    <div className="shrink-0 border-t border-white/5 bg-zinc-950/95 px-6 py-4 backdrop-blur-sm">
      <div className="mx-auto flex max-w-4xl gap-3">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) handleSubmit()
          }}
          disabled={isLocked}
          placeholder={placeholder}
          className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white transition-opacity placeholder:text-white/20 focus:ring-2 focus:ring-white/15 focus:outline-none disabled:opacity-40"
        />
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          aria-label="Send follow-up"
          className="shrink-0 rounded-xl bg-white/8 px-4 py-2.5 text-white/60 transition-colors hover:bg-white/15 hover:text-white disabled:opacity-25"
        >
          {followUpStatus === "submitting" ? (
            <span className="block h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white/70" />
          ) : (
            <ArrowRight className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  )
}
