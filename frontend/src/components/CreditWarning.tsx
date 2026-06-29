"use client"

// Modal that appears before a follow-up pipeline run (5-credit cost).
// Shows the cost and the user's remaining balance.
// If credits < 5 the confirm button is disabled and an explanation is shown.

interface CreditWarningProps {
  creditsRemaining: number
  onConfirm: () => void
  onCancel: () => void
}

export function CreditWarning({ creditsRemaining, onConfirm, onCancel }: CreditWarningProps) {
  const canAfford = creditsRemaining >= 5

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onCancel}
    >
      {/* Panel — stop propagation so clicks inside don't close */}
      <div
        className="w-full max-w-sm space-y-5 rounded-2xl border border-white/10 bg-zinc-900 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-1">
          <p className="text-sm font-semibold text-white">Start new research?</p>
          <p className="text-xs leading-relaxed text-white/40">
            This follow-up introduces a new topic. Chorus will run a full pipeline — planner, 3
            researchers, critic, and synthesizer.
          </p>
        </div>

        {/* Cost row */}
        <div className="space-y-2">
          <div className="flex items-center justify-between rounded-xl border border-white/8 bg-white/3 px-4 py-2.5">
            <span className="text-xs text-white/50">Cost</span>
            <span className="font-mono text-xs text-white">5 ◉</span>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-white/8 bg-white/3 px-4 py-2.5">
            <span className="text-xs text-white/50">Your balance</span>
            <span className={`font-mono text-xs ${canAfford ? "text-white" : "text-red-400"}`}>
              {creditsRemaining} ◉
            </span>
          </div>
        </div>

        {/* Insufficient credits warning */}
        {!canAfford && (
          <p className="text-xs leading-relaxed text-red-400">
            Insufficient credits. Your balance resets daily at midnight UTC.
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm text-white/40 transition-colors hover:text-white/70"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!canAfford}
            className="flex-1 rounded-xl bg-white py-2.5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-white/90 disabled:opacity-40"
          >
            Start research
          </button>
        </div>
      </div>
    </div>
  )
}
