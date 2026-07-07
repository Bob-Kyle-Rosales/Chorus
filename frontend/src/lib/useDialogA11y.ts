"use client"

import { useEffect, useRef } from "react"

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

// Shared behavior for the app's small confirmation modals: focuses the panel
// on open, closes on Escape, and keeps Tab from leaking focus to the page
// underneath. Panels using this need `tabIndex={-1}` so they're programmatically focusable.
export function useDialogA11y<T extends HTMLElement>(onCancel: () => void) {
  const ref = useRef<T>(null)

  useEffect(() => {
    const panel = ref.current
    if (!panel) return
    panel.focus()

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onCancel()
        return
      }
      if (e.key !== "Tab") return

      const focusable = panel!.querySelectorAll<HTMLElement>(FOCUSABLE)
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [onCancel])

  return ref
}
