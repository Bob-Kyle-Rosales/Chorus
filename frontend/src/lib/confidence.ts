// Shared confidence badge styling for findings and the overall report.
// "low" deliberately isn't red — low confidence means "we're less sure",
// not "something broke", so it gets the same muted tone as de-emphasized
// text rather than the alarm color used for actual errors.
export const CONFIDENCE_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  high: { bg: "rgba(143,203,170,0.12)", color: "var(--chorus-green)", border: "rgba(143,203,170,0.4)" },
  medium: { bg: "rgba(201,162,74,0.12)", color: "var(--chorus-gold)", border: "rgba(201,162,74,0.4)" },
  low: { bg: "rgba(214,205,181,0.12)", color: "var(--chorus-muted)", border: "rgba(214,205,181,0.4)" },
}
