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
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(13,20,32,0.85)" }}
      onClick={onCancel}
    >
      {/* Panel — stop propagation so clicks inside don't close */}
      <div
        className="w-full max-w-sm space-y-5 p-6"
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
            Start new research?
          </p>
          <p className="text-xs leading-relaxed" style={{ color: "var(--chorus-muted)" }}>
            This follow-up introduces a new topic. Chorus will run a full pipeline — planner, 3
            researchers, critic, and synthesizer.
          </p>
        </div>

        {/* Cost row */}
        <div className="space-y-2">
          <div
            className="flex items-center justify-between px-4 py-2.5"
            style={{
              border: "1px solid var(--chorus-border)",
              borderRadius: "4px",
              background: "var(--chorus-bg)",
            }}
          >
            <span className="text-xs" style={{ color: "var(--chorus-muted)" }}>Cost</span>
            <span className="font-mono text-xs" style={{ color: "var(--chorus-gold)" }}>5 ◉</span>
          </div>
          <div
            className="flex items-center justify-between px-4 py-2.5"
            style={{
              border: "1px solid var(--chorus-border)",
              borderRadius: "4px",
              background: "var(--chorus-bg)",
            }}
          >
            <span className="text-xs" style={{ color: "var(--chorus-muted)" }}>Your balance</span>
            <span
              className="font-mono text-xs"
              style={{ color: canAfford ? "var(--chorus-gold)" : "#f87171" }}
            >
              {creditsRemaining} ◉
            </span>
          </div>
        </div>

        {/* Insufficient credits warning */}
        {!canAfford && (
          <p className="text-xs leading-relaxed" style={{ color: "#f87171" }}>
            Insufficient credits. Your balance resets daily at midnight UTC.
          </p>
        )}

        {/* Actions */}
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
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!canAfford}
            className="flex-1 py-2.5 text-sm font-semibold transition-colors disabled:opacity-40"
            style={{
              background: "var(--chorus-gold)",
              color: "var(--chorus-bg)",
              borderRadius: "4px",
              border: "none",
            }}
          >
            Start research
          </button>
        </div>
      </div>
    </div>
  )
}
