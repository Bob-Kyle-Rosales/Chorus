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
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(13,20,32,0.85)" }}
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm space-y-4 p-6"
        style={{
          background: "var(--chorus-surface)",
          border: "1px solid var(--chorus-border)",
          borderTop: "2px solid var(--chorus-gold)",
          borderRadius: "4px",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-1">
          <p
            className="text-sm font-semibold"
            style={{ fontFamily: "var(--font-heading)", color: "var(--chorus-text)" }}
          >
            {isBlocked ? "Max concurrent runs reached" : "A run is already in progress"}
          </p>
          <p className="text-xs leading-relaxed" style={{ color: "var(--chorus-muted)" }}>
            {isBlocked
              ? "You already have 2 research runs active. Wait for one to finish before starting another."
              : "One research run is active in the background. Starting another costs 5 additional credits."}
          </p>
        </div>

        {!isBlocked && (
          <div
            className="flex items-center justify-between px-4 py-2.5"
            style={{
              border: "1px solid var(--chorus-border)",
              borderRadius: "4px",
              background: "var(--chorus-bg)",
            }}
          >
            <span className="text-xs" style={{ color: "var(--chorus-muted)" }}>Additional cost</span>
            <span className="font-mono text-xs" style={{ color: "var(--chorus-gold)" }}>5 ◉</span>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 text-sm transition-colors"
            style={{
              border: "1px solid var(--chorus-border)",
              borderRadius: "4px",
              color: "var(--chorus-muted)",
              background: "transparent",
            }}
          >
            {isBlocked ? "OK" : "Cancel"}
          </button>
          {!isBlocked && (
            <button
              onClick={onConfirm}
              className="flex-1 py-2.5 text-sm font-semibold transition-colors"
              style={{
                background: "var(--chorus-gold)",
                color: "var(--chorus-bg)",
                borderRadius: "4px",
                border: "none",
              }}
            >
              Start anyway
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
