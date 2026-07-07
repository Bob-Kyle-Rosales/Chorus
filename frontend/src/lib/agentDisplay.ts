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

export const AGENT_LABEL: Record<string, string> = {
  researcher_0: "Researcher I",
  researcher_1: "Researcher II",
  researcher_2: "Researcher III",
  critic: "Critic",
  synthesizer: "Synthesizer",
  planner: "Planner",
}
