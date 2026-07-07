"use client"

import { motion } from "framer-motion"
import { FindingCard } from "@/components/FindingCard"
import { ContestedPoint } from "@/components/ContestedPoint"
import { SourcesList } from "@/components/SourcesList"
import { CONFIDENCE_STYLE } from "@/lib/confidence"
import type { Report } from "@/types/events"

function SectionDivider({ label, count }: { label: string; count?: number }) {
  return (
    <div className="flex items-center gap-3">
      <span
        className="shrink-0 font-mono text-xs tracking-widest uppercase"
        style={{ color: "var(--chorus-muted)" }}
      >
        {label}
        {count !== undefined && ` · ${count}`}
      </span>
      <div className="flex-1" style={{ borderTop: "1px solid var(--chorus-border)" }} />
    </div>
  )
}

export function ReportView({ report }: { report: Report }) {
  const badge = CONFIDENCE_STYLE[report.confidence_overall] ?? CONFIDENCE_STYLE.medium

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-8"
    >
      {/* Report header */}
      <div className="flex items-center justify-between">
        <p
          className="font-mono text-xs tracking-widest uppercase"
          style={{ color: "var(--chorus-muted)" }}
        >
          Research Report
        </p>
        <span
          className="rounded px-2.5 py-1 font-mono text-xs tracking-wider uppercase"
          style={{ background: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}
        >
          {report.confidence_overall} confidence
        </span>
      </div>

      {/* Summary */}
      <div className="space-y-3">
        <SectionDivider label="Summary" />
        <div
          className="rounded px-5 py-4"
          style={{ background: "var(--chorus-surface)", border: "1px solid var(--chorus-border)" }}
        >
          <p
            className="leading-relaxed"
            style={{ color: "var(--chorus-text)", fontFamily: "var(--font-sans)" }}
          >
            {report.tl_dr}
          </p>
        </div>
      </div>

      {/* Key findings */}
      {report.key_findings.length > 0 && (
        <div className="space-y-3">
          <SectionDivider label="Key Findings" count={report.key_findings.length} />
          <div className="space-y-3">
            {report.key_findings.map((finding, i) => (
              <FindingCard key={i} finding={finding} index={i} allSources={report.sources} />
            ))}
          </div>
        </div>
      )}

      {/* Contested points */}
      {report.contested_points.length > 0 && (
        <div className="space-y-3">
          <SectionDivider label="Contested Points" count={report.contested_points.length} />
          <div className="space-y-3">
            {report.contested_points.map((point, i) => (
              <ContestedPoint key={i} point={point} index={i} allSources={report.sources} />
            ))}
          </div>
        </div>
      )}

      {/* Sources */}
      {report.sources.length > 0 && (
        <div className="space-y-3">
          <SectionDivider label="Sources" count={report.sources.length} />
          <SourcesList sources={report.sources} />
        </div>
      )}

      {/* Timestamp */}
      <p
        className="text-right font-mono text-xs"
        style={{ color: "var(--chorus-muted)" }}
      >
        Generated {new Date(report.generated_at).toLocaleString()}
      </p>
    </motion.div>
  )
}
