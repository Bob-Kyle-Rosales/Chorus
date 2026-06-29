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
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onCancel}
    >
      {/* Panel — stop propagation so clicks inside don't close */}
      <div
        className="bg-zinc-900 border border-white/10 rounded-2xl p-6 w-full max-w-sm space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-1">
          <p className="text-sm font-semibold text-white">Start new research?</p>
          <p className="text-xs text-white/40 leading-relaxed">
            This follow-up introduces a new topic. Chorus will run a full
            pipeline — planner, 3 researchers, critic, and synthesizer.
          </p>
        </div>

        {/* Cost row */}
        <div className="space-y-2">
          <div className="flex items-center justify-between border border-white/8 rounded-xl px-4 py-2.5 bg-white/3">
            <span className="text-xs text-white/50">Cost</span>
            <span className="text-xs font-mono text-white">5 ◉</span>
          </div>
          <div className="flex items-center justify-between border border-white/8 rounded-xl px-4 py-2.5 bg-white/3">
            <span className="text-xs text-white/50">Your balance</span>
            <span className={`text-xs font-mono ${canAfford ? "text-white" : "text-red-400"}`}>
              {creditsRemaining} ◉
            </span>
          </div>
        </div>

        {/* Insufficient credits warning */}
        {!canAfford && (
          <p className="text-xs text-red-400 leading-relaxed">
            Insufficient credits. Your balance resets daily at midnight UTC.
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 text-sm text-white/40 hover:text-white/70 border border-white/10 rounded-xl py-2.5 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!canAfford}
            className="flex-1 text-sm bg-white text-zinc-950 font-semibold rounded-xl py-2.5 hover:bg-white/90 disabled:opacity-40 transition-colors"
          >
            Start research
          </button>
        </div>
      </div>
    </div>
  )
}
