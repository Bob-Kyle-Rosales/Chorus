"use client"

// Modal shown when the user tries to start a new research session while
// one (or more) pipeline runs are already active in the background.
//
// Two states:
//   activeCount === 1  → warn + offer to proceed (costs 5 more ◉)
//   activeCount >= 2   → hard block (max 2 concurrent runs)

interface ConcurrentRunWarningProps {
  activeCount: number
  onConfirm: () => void  // only enabled when activeCount === 1
  onCancel: () => void
}

export function ConcurrentRunWarning({ activeCount, onConfirm, onCancel }: ConcurrentRunWarningProps) {
  const isBlocked = activeCount >= 2

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onCancel}
    >
      <div
        className="bg-zinc-900 border border-white/10 rounded-2xl p-6 w-full max-w-sm space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-1">
          <p className="text-sm font-semibold text-white">
            {isBlocked ? "Max concurrent runs reached" : "A run is already in progress"}
          </p>
          <p className="text-xs text-white/40 leading-relaxed">
            {isBlocked
              ? "You already have 2 research runs active. Wait for one to finish before starting another."
              : "One research run is active in the background. Starting another costs 5 additional credits."}
          </p>
        </div>

        {!isBlocked && (
          <div className="flex items-center justify-between border border-white/8 rounded-xl px-4 py-2.5 bg-white/3">
            <span className="text-xs text-white/50">Additional cost</span>
            <span className="text-xs font-mono text-white">5 ◉</span>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 text-sm text-white/40 hover:text-white/70 border border-white/10 rounded-xl py-2.5 transition-colors"
          >
            {isBlocked ? "OK" : "Cancel"}
          </button>
          {!isBlocked && (
            <button
              onClick={onConfirm}
              className="flex-1 text-sm bg-white text-zinc-950 font-semibold rounded-xl py-2.5 hover:bg-white/90 transition-colors"
            >
              Start anyway
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
