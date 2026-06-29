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

export function FollowUpInput({ onSubmit, runStatus, followUpStatus, credits }: FollowUpInputProps) {
  const [value, setValue] = useState("")

  const isLocked = runStatus === "running" || followUpStatus !== "idle"
  const hasCredits = credits > 0
  const canSubmit = !isLocked && hasCredits && value.trim().length > 0

  const placeholder = isLocked
    ? "Research in progress..."
    : !hasCredits
    ? "Credits reset tomorrow at midnight UTC"
    : "Ask a follow-up, or say \"tell me more about finding 2\"..."

  function handleSubmit() {
    if (!canSubmit) return
    const q = value.trim()
    setValue("")
    onSubmit(q)
  }

  return (
    <div className="shrink-0 border-t border-white/5 bg-zinc-950/95 backdrop-blur-sm px-6 py-4">
      <div className="flex gap-3 max-w-4xl mx-auto">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) handleSubmit() }}
          disabled={isLocked}
          placeholder={placeholder}
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-white/15 disabled:opacity-40 transition-opacity"
        />
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          aria-label="Send follow-up"
          className="bg-white/8 text-white/60 hover:bg-white/15 hover:text-white disabled:opacity-25 rounded-xl px-4 py-2.5 transition-colors shrink-0"
        >
          {followUpStatus === "submitting" ? (
            <span className="block w-4 h-4 border-2 border-white/20 border-t-white/70 rounded-full animate-spin" />
          ) : (
            <ArrowRight className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  )
}
