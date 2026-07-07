import { useAuthStore } from "@/lib/auth-store"
import type { ServerEvent } from "@/types/events"

const WS_BASE = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8000"

export function createRunSocket(
  runId: string,
  question: string,
  onEvent: (event: ServerEvent) => void,
  onClose?: () => void,
): WebSocket {
  const url = `${WS_BASE}/ws/${runId}`
  const ws = new WebSocket(url)

  // The token and question travel as the first message, not URL query
  // params — a URL ends up in access logs, proxies, and browser history.
  // The backend requires this run_id to have been authorized for the caller
  // (session creation or a confirmed credit deduction already did that); the
  // token here just proves who the caller is.
  ws.onopen = () => {
    const token = useAuthStore.getState().accessToken ?? ""
    ws.send(JSON.stringify({ token, question }))
  }

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
