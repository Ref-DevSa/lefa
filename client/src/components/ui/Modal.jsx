import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'

/**
 * Accessible modal dialog: Escape and backdrop click close it, focus moves
 * into it on open and returns to the opener on close.
 * @param {{ open: boolean, onClose: () => void, title: string, children: React.ReactNode, footer?: React.ReactNode }} props
 */
export function Modal({ open, onClose, title, children, footer }) {
  const titleId = useId()
  const panelRef = useRef(/** @type {HTMLDivElement | null} */ (null))
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) return
    const opener = /** @type {HTMLElement | null} */ (document.activeElement)
    const panel = panelRef.current
    const first = panel?.querySelector(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    )
    ;/** @type {HTMLElement} */ (first ?? panel)?.focus()

    /** @param {KeyboardEvent} e */
    function onKey(e) {
      if (e.key === 'Escape') onCloseRef.current()
    }
    document.addEventListener('keydown', onKey)
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      opener?.focus?.()
    }
  }, [open])

  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <div className="absolute inset-0 bg-ink/40" aria-hidden="true" data-testid="modal-backdrop" onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative w-full max-w-md rounded-[var(--radius-card)] bg-surface p-6 shadow-lg"
      >
        <h2 id={titleId} className="mb-3 text-xl font-semibold text-ink">
          {title}
        </h2>
        <div className="text-ink">{children}</div>
        {footer && <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}
