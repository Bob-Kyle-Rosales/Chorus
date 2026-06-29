"use client"

import { motion } from "framer-motion"
import { FindingCard } from "@/components/FindingCard"
import { ContestedPoint } from "@/components/ContestedPoint"
import { SourcesList } from "@/components/SourcesList"
import type { Report } from "@/types/events"

// Overall confidence badge — same palette as FindingCard's per-finding badge
const OVERALL_CONFIDENCE_STYLES: Record<string, string> = {
  high: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  medium: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  low: "bg-red-500/15 text-red-400 border-red-500/30",
}

// Divider with label — used between every major section
function SectionHeader({ label, count }: { label: string; count?: number }) {
  return (
    <div className="flex items-center gap-3">
      <h3 className="text-xs font-mono text-white/30 uppercase tracking-widest shrink-0">
        {label}
      </h3>
      {count !== undefined && (
        <span className="text-[10px] font-mono text-white/20">{count}</span>
      )}
      <div className="flex-1 border-t border-white/5" />
    </div>
  )
}

interface ReportViewProps {
  report: Report
}

export function ReportView({ report }: ReportViewProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-8"
    >
      {/* ── Report header ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-mono text-white/25 uppercase tracking-widest">
          Research Report
        </p>
        <span
          className={`text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full border ${OVERALL_CONFIDENCE_STYLES[report.confidence_overall]}`}
        >
          Overall · {report.confidence_overall}
        </span>
      </div>

      {/* ── Summary ───────────────────────────────────────────────── */}
      <div className="space-y-3">
        <SectionHeader label="Summary" />
        <div className="border border-white/8 rounded-xl px-5 py-4 bg-white/3">
          <p className="text-sm text-white/70 leading-relaxed">{report.tl_dr}</p>
        </div>
      </div>

      {/* ── Key Findings ──────────────────────────────────────────── */}
      {report.key_findings.length > 0 && (
        <div className="space-y-3">
          <SectionHeader label="Key Findings" count={report.key_findings.length} />
          <div className="space-y-3">
            {report.key_findings.map((finding, i) => (
              <FindingCard
                key={i}
                finding={finding}
                index={i}
                allSources={report.sources}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Contested Points ──────────────────────────────────────── */}
      {report.contested_points.length > 0 && (
        <div className="space-y-3">
          <SectionHeader label="Contested Points" count={report.contested_points.length} />
          <div className="space-y-3">
            {report.contested_points.map((point, i) => (
              <ContestedPoint key={i} point={point} index={i} />
            ))}
          </div>
        </div>
      )}

      {/* ── Sources ───────────────────────────────────────────────── */}
      {report.sources.length > 0 && (
        <div className="space-y-3">
          <SectionHeader label="Sources" count={report.sources.length} />
          <SourcesList sources={report.sources} />
        </div>
      )}

      {/* ── Timestamp ─────────────────────────────────────────────── */}
      <p className="text-[10px] font-mono text-white/15 text-right">
        Generated {new Date(report.generated_at).toLocaleString()}
      </p>
    </motion.div>
  )
}
