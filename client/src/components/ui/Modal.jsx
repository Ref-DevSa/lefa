import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../../lib/cn.js'

/**
 * Accessible modal dialog: Escape and backdrop click close it, focus moves
 * into it on open and returns to the opener on close.
 * Tall content scrolls inside the panel; `size="lg"` suits forms.
 * @param {{ open: boolean, onClose: () => void, title: string, description?: string, size?: 'md' | 'lg',
 *   children: React.ReactNode, footer?: React.ReactNode }} props
 */
export function Modal({ open, onClose, title, description, size = 'md', children, footer }) {
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
        className={cn(
          'relative max-h-[calc(100dvh-2rem)] w-full overflow-y-auto rounded-card bg-surface p-6 shadow-lg',
          size === 'lg' ? 'max-w-2xl' : 'max-w-md',
        )}
      >
        <h2 id={titleId} className="mb-1 text-xl font-semibold text-ink">
          {title}
        </h2>
        {description && <p className="mb-4 text-muted">{description}</p>}
        {!description && <div className="mb-2" />}
        <div className="text-ink">{children}</div>
        {footer && <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}
