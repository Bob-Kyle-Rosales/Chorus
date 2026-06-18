import type { ServerEvent } from "@/types/events"

const WS_BASE = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8000"

export function createRunSocket(
  runId: string,
  question: string,
  onEvent: (event: ServerEvent) => void,
  onClose?: () => void,
): WebSocket {
  const url = `${WS_BASE}/ws/${runId}?question=${encodeURIComponent(question)}`
  const ws = new WebSocket(url)

  ws.onmessage = (msg) => {
    try {
      const event = JSON.parse(msg.data) as ServerEvent
      onEvent(event)
    } catch {
      console.error("Failed to parse WS event:", msg.data)
    }
  }

  ws.onerror = (e) => console.error("WebSocket error", e)
  ws.onclose = () => onClose?.()

  return ws
}
