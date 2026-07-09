// Staff-line pipeline visualization ──────────────────────────────────────
// Five horizontal SVG lines (like a music staff) with agent nodes
// at their respective horizontal positions. Researcher I/II/III share
// the same x position at different staff lines, and both branch from
// Planner and converge into Critic — the geometry itself shows that
// the three researchers run concurrently, not in sequence. A small dot
// travels along each connector on a staggered loop to reinforce that
// this is a live, running pipeline, not a static chart.
interface PipelineVizProps {
  maxWidth?: number
}

const CONNECTORS: { id: string; d: string; begin: number }[] = [
  { id: "pv-c1", d: "M110,112 L175,68", begin: 0 },
  { id: "pv-c2", d: "M110,112 L175,112", begin: 0.15 },
  { id: "pv-c3", d: "M110,112 L175,156", begin: 0.3 },
  { id: "pv-c4", d: "M265,68 L320,112", begin: 1 },
  { id: "pv-c5", d: "M265,112 L320,112", begin: 1.15 },
  { id: "pv-c6", d: "M265,156 L320,112", begin: 1.3 },
  { id: "pv-c7", d: "M400,112 L450,112", begin: 2 },
]

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

      {/* Invisible paths (motion guides) + traveling pulse dots, one per connector */}
      {CONNECTORS.map((c) => (
        <path key={c.id} id={c.id} d={c.d} fill="none" stroke="none" />
      ))}
      {CONNECTORS.map((c) => (
        <circle key={`${c.id}-dot`} r={3} fill={nodeColor} opacity={0.9}>
          <animateMotion dur="2s" begin={`${c.begin}s`} repeatCount="indefinite">
            <mpath href={`#${c.id}`} />
          </animateMotion>
        </circle>
      ))}

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
