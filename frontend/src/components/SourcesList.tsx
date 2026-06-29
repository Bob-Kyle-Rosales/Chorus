"use client"

import { ExternalLink } from "lucide-react"
import type { Citation } from "@/types/events"

// Extracts just the hostname from a URL for compact display.
// Falls back to the raw URL string if parsing fails.
function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return url
  }
}

interface SourcesListProps {
  sources: Citation[]
}

export function SourcesList({ sources }: SourcesListProps) {
  if (sources.length === 0) return null

  return (
    <ol className="space-y-4">
      {sources.map((source, i) => (
        <li key={source.url} className="group flex gap-3">
          {/* Source number */}
          <span className="mt-0.5 w-5 shrink-0 text-right font-mono text-[10px] text-white/20">
            {i + 1}.
          </span>

          <div className="min-w-0 space-y-0.5">
            {/* Clickable title */}
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs leading-snug text-white/60 transition-colors hover:text-white"
            >
              <span className="line-clamp-2">{source.title || hostname(source.url)}</span>
              <ExternalLink className="h-2.5 w-2.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-60" />
            </a>

            {/* Hostname */}
            <p className="text-[10px] text-white/25">{hostname(source.url)}</p>

            {/* Snippet preview */}
            {source.snippet && (
              <p className="line-clamp-2 text-[10px] leading-relaxed text-white/20 italic">
                "{source.snippet}"
              </p>
            )}
          </div>
        </li>
      ))}
    </ol>
  )
}
