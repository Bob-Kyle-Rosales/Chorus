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
        <li key={source.url} className="flex gap-3 group">
          {/* Source number */}
          <span className="text-[10px] font-mono text-white/20 shrink-0 mt-0.5 w-5 text-right">
            {i + 1}.
          </span>

          <div className="min-w-0 space-y-0.5">
            {/* Clickable title */}
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-white/60 hover:text-white transition-colors leading-snug"
            >
              <span className="line-clamp-2">
                {source.title || hostname(source.url)}
              </span>
              <ExternalLink className="w-2.5 h-2.5 shrink-0 opacity-0 group-hover:opacity-60 transition-opacity" />
            </a>

            {/* Hostname */}
            <p className="text-[10px] text-white/25">{hostname(source.url)}</p>

            {/* Snippet preview */}
            {source.snippet && (
              <p className="text-[10px] text-white/20 line-clamp-2 leading-relaxed italic">
                "{source.snippet}"
              </p>
            )}
          </div>
        </li>
      ))}
    </ol>
  )
}
