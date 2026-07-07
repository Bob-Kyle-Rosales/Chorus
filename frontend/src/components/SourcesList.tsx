"use client"

import type { Citation } from "@/types/events"

export function SourcesList({ sources }: { sources: Citation[] }) {
  return (
    <ol className="space-y-2">
      {sources.map((source, i) => (
        <li key={i} className="flex items-start gap-3">
          <span
            className="mt-0.5 shrink-0 font-mono text-xs"
            style={{ color: "var(--chorus-muted)" }}
          >
            {String(i + 1).padStart(2, "0")}
          </span>
          <div className="min-w-0 space-y-0.5">
            {source.title && (
              <p className="text-sm font-medium" style={{ color: "var(--chorus-text)" }}>
                {source.title}
              </p>
            )}
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block truncate font-mono text-xs transition-colors hover:opacity-80"
              style={{ color: "var(--chorus-gold)" }}
            >
              {source.url}
            </a>
          </div>
        </li>
      ))}
    </ol>
  )
}
