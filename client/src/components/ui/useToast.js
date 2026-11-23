import { createContext, useContext } from 'react'

/** @typedef {'success' | 'error' | 'info'} ToastTone */

export const ToastContext = createContext(
  /** @type {((message: string, tone?: ToastTone) => void) | null} */ (null),
)

/** Returns `toast(message, tone?)`. Must be used inside <ToastProvider>. */
export function useToast() {
  const toast = useContext(ToastContext)
  if (!toast) throw new Error('useToast must be used inside <ToastProvider>')
  return toast
}
