// Shared per-agent color and label lookup — used by both the full and
// mini agent cards so the two can't drift out of sync with each other.
export const AGENT_ACCENT: Record<string, string> = {
  researcher_0: "var(--chorus-blue)",
  researcher_1: "var(--chorus-green)",
  researcher_2: "var(--chorus-pink)",
  critic: "var(--chorus-gold)",
  synthesizer: "var(--chorus-gold)",
  planner: "var(--chorus-muted)",
}

// Literal-color companion to AGENT_ACCENT, used only for framer-motion-animated
// box-shadow glows. framer-motion cannot interpolate a color animation between
// unresolved CSS custom properties (var(--chorus-*)) — it needs literal,
// parseable colors to tween between. These rgba values are the same colors
// AGENT_ACCENT points to via CSS variables (see globals.css: --chorus-blue,
// --chorus-green, --chorus-pink, --chorus-gold, --chorus-muted) — kept in this
// file, next to AGENT_ACCENT, so a future palette change has the best chance
// of being caught here too, even though it can't auto-follow the CSS variable.
export const AGENT_GLOW_SHADOW: Record<string, [dim: string, bright: string]> = {
  researcher_0: ["0 0 6px rgba(127,184,216,0.4)", "0 0 16px rgba(127,184,216,0.85)"],
  researcher_1: ["0 0 6px rgba(143,203,170,0.4)", "0 0 16px rgba(143,203,170,0.85)"],
  researcher_2: ["0 0 6px rgba(201,138,168,0.4)", "0 0 16px rgba(201,138,168,0.85)"],
  critic: ["0 0 6px rgba(201,162,74,0.4)", "0 0 16px rgba(201,162,74,0.85)"],
  synthesizer: ["0 0 6px rgba(201,162,74,0.4)", "0 0 16px rgba(201,162,74,0.85)"],
  planner: ["0 0 6px rgba(214,205,181,0.4)", "0 0 16px rgba(214,205,181,0.85)"],
}

export const AGENT_LABEL: Record<string, string> = {
  researcher_0: "Researcher I",
  researcher_1: "Researcher II",
  researcher_2: "Researcher III",
  critic: "Critic",
  synthesizer: "Synthesizer",
  planner: "Planner",
}
