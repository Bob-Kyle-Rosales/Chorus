"use client"

import { motion } from "framer-motion"
import { FindingCard } from "@/components/FindingCard"
import { ContestedPoint } from "@/components/ContestedPoint"
import { SourcesList } from "@/components/SourcesList"
import type { Report } from "@/types/events"

const CONFIDENCE_BADGE: Record<string, { bg: string; color: string; border: string }> = {
  high: { bg: "rgba(143,203,170,0.12)", color: "var(--chorus-green)", border: "rgba(143,203,170,0.4)" },
  medium: { bg: "rgba(201,162,74,0.12)", color: "var(--chorus-gold)", border: "rgba(201,162,74,0.4)" },
  low: { bg: "rgba(239,68,68,0.10)", color: "#ef4444", border: "rgba(239,68,68,0.4)" },
}

function SectionDivider({ label, count }: { label: string; count?: number }) {
  return (
    <div className="flex items-center gap-3">
      <span
        className="shrink-0 font-mono text-xs tracking-widest uppercase"
        style={{ color: "var(--chorus-border)" }}
      >
        {label}
        {count !== undefined && ` · ${count}`}
      </span>
      <div className="flex-1" style={{ borderTop: "1px solid var(--chorus-border)" }} />
    </div>
  )
}

export function ReportView({ report }: { report: Report }) {
  const badge = CONFIDENCE_BADGE[report.confidence_overall] ?? CONFIDENCE_BADGE.medium

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
          style={{ color: "var(--chorus-border)" }}
        >
          Research Report
        </p>
        <span
          className="rounded px-2.5 py-1 font-mono text-[10px] tracking-wider uppercase"
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
              <ContestedPoint key={i} point={point} index={i} />
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
        className="text-right font-mono text-[10px]"
        style={{ color: "var(--chorus-border)" }}
      >
        Generated {new Date(report.generated_at).toLocaleString()}
      </p>
    </motion.div>
  )
}
