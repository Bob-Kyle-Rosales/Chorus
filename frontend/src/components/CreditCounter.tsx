"use client"

// Displays the current credit balance.
// Colour changes as credits get low:
//   > 5  → white/dim (normal)
//   1-5  → amber (getting low)
//   0    → red (exhausted)

interface CreditCounterProps {
  credits: number
  showLabel?: boolean // show "Credits today" label above the number
}

export function CreditCounter({ credits, showLabel = false }: CreditCounterProps) {
  const colour = credits === 0 ? "text-red-400" : credits <= 5 ? "text-amber-400" : "text-white/50"

  return (
    <div className="flex items-center justify-between">
      {showLabel && <span className="text-[11px] text-white/30">Credits today</span>}
      <span className={`font-mono text-[11px] tabular-nums ${colour}`}>{credits} ◉</span>
    </div>
  )
}
