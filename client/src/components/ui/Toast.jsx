import { useCallback, useMemo, useRef, useState } from 'react'
import { cn } from '../../lib/cn.js'
import { ToastContext } from './useToast.js'

/** @typedef {import('./useToast.js').ToastTone} ToastTone */
/** @typedef {{ id: number, message: string, tone: ToastTone }} ToastItem */

const TONES = {
  success: 'border-success text-success',
  error: 'border-danger text-danger',
  info: 'border-info text-info',
}

/** @param {{ children: React.ReactNode, duration?: number }} props */
export function ToastProvider({ children, duration = 4000 }) {
  const [toasts, setToasts] = useState(/** @type {ToastItem[]} */ ([]))
  const nextId = useRef(1)

  const dismiss = useCallback((/** @type {number} */ id) => {
    setToasts((all) => all.filter((t) => t.id !== id))
  }, [])

  const show = useCallback(
    (/** @type {string} */ message, /** @type {ToastTone} */ tone = 'info') => {
      const id = nextId.current++
      setToasts((all) => [...all, { id, message, tone }])
      setTimeout(() => dismiss(id), duration)
    },
    [dismiss, duration],
  )

  const value = useMemo(() => show, [show])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4 sm:bottom-6"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.tone === 'error' ? 'alert' : 'status'}
            className={cn(
              'pointer-events-auto flex w-full max-w-sm items-center justify-between gap-3 rounded-control border-l-4 bg-surface px-4 py-3 shadow-lg',
              TONES[t.tone],
            )}
          >
            <span className="text-ink">{t.message}</span>
            <button type="button" onClick={() => dismiss(t.id)} className="text-sm font-medium text-muted hover:text-ink">
              Dismiss
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
