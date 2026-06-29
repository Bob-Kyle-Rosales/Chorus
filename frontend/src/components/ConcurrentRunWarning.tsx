"use client"

// Modal shown when the user tries to start a new research session while
// one (or more) pipeline runs are already active in the background.
//
// Two states:
//   activeCount === 1  → warn + offer to proceed (costs 5 more ◉)
//   activeCount >= 2   → hard block (max 2 concurrent runs)

interface ConcurrentRunWarningProps {
  activeCount: number
  onConfirm: () => void // only enabled when activeCount === 1
  onCancel: () => void
}

export function ConcurrentRunWarning({
  activeCount,
  onConfirm,
  onCancel,
}: ConcurrentRunWarningProps) {
  const isBlocked = activeCount >= 2

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm space-y-4 rounded-2xl border border-white/10 bg-zinc-900 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-1">
          <p className="text-sm font-semibold text-white">
            {isBlocked ? "Max concurrent runs reached" : "A run is already in progress"}
          </p>
          <p className="text-xs leading-relaxed text-white/40">
            {isBlocked
              ? "You already have 2 research runs active. Wait for one to finish before starting another."
              : "One research run is active in the background. Starting another costs 5 additional credits."}
          </p>
        </div>

        {!isBlocked && (
          <div className="flex items-center justify-between rounded-xl border border-white/8 bg-white/3 px-4 py-2.5">
            <span className="text-xs text-white/50">Additional cost</span>
            <span className="font-mono text-xs text-white">5 ◉</span>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm text-white/40 transition-colors hover:text-white/70"
          >
            {isBlocked ? "OK" : "Cancel"}
          </button>
          {!isBlocked && (
            <button
              onClick={onConfirm}
              className="flex-1 rounded-xl bg-white py-2.5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-white/90"
            >
              Start anyway
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
