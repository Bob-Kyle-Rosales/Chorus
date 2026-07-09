// Staff-line pipeline visualization ──────────────────────────────────────
// Five horizontal SVG lines (like a music staff) with agent nodes
// at their respective horizontal positions. Researcher I/II/III share
// the same x position at different staff lines, and both branch from
// Planner and converge into Critic — the geometry itself shows that
// the three researchers run concurrently, not in sequence.
interface PipelineVizProps {
  maxWidth?: number
}

export function PipelineViz({ maxWidth = 560 }: PipelineVizProps) {
  const width = 560
  const height = 220
  const lineColor = "#2a3644"
  const nodeColor = "#c9a24a"
  const textColor = "#c3b795"

  // 5 staff lines at equal vertical spacing
  const lines = [24, 68, 112, 156, 200]

  // Agent nodes: [label, x, y-line-index]
  const nodes: [string, number, number][] = [
    ["Planner", 70, 2],
    ["Researcher I", 210, 1],
    ["Researcher II", 210, 2],
    ["Researcher III", 210, 3],
    ["Critic", 360, 2],
    ["Synthesizer", 490, 2],
  ]

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      aria-label="Chorus agent pipeline visualization"
      style={{ maxWidth }}
    >
      {/* Staff lines */}
      {lines.map((y) => (
        <line key={y} x1={0} y1={y} x2={width} y2={y} stroke={lineColor} strokeWidth={1} />
      ))}

      {/* Connector lines between agent groups */}
      {/* Planner → Researchers */}
      <line x1={110} y1={lines[2]} x2={175} y2={lines[1]} stroke={lineColor} strokeWidth={1} strokeDasharray="3 3" />
      <line x1={110} y1={lines[2]} x2={175} y2={lines[2]} stroke={lineColor} strokeWidth={1} strokeDasharray="3 3" />
      <line x1={110} y1={lines[2]} x2={175} y2={lines[3]} stroke={lineColor} strokeWidth={1} strokeDasharray="3 3" />
      {/* Researchers → Critic */}
      <line x1={265} y1={lines[1]} x2={320} y2={lines[2]} stroke={lineColor} strokeWidth={1} strokeDasharray="3 3" />
      <line x1={265} y1={lines[2]} x2={320} y2={lines[2]} stroke={lineColor} strokeWidth={1} strokeDasharray="3 3" />
      <line x1={265} y1={lines[3]} x2={320} y2={lines[2]} stroke={lineColor} strokeWidth={1} strokeDasharray="3 3" />
      {/* Critic → Synthesizer */}
      <line x1={400} y1={lines[2]} x2={450} y2={lines[2]} stroke={lineColor} strokeWidth={1} strokeDasharray="3 3" />

      {/* Agent nodes */}
      {nodes.map(([label, x, lineIdx]) => {
        const y = lines[lineIdx]
        return (
          <g key={label} transform={`translate(${x},${y})`}>
            <circle r={6.5} fill={nodeColor} />
            <text
              y={-14}
              textAnchor="middle"
              fontSize={12}
              fill={textColor}
              fontFamily="monospace"
            >
              {label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
