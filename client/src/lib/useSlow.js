import { useEffect, useState } from 'react'

/**
 * True once something has been loading for longer than `ms`. Used to explain
 * a slow first load (our free API host sleeps when idle) instead of leaving
 * people staring at a spinner wondering if Lefa is broken.
 * @param {boolean} active
 * @param {number} [ms]
 */
export function useSlow(active, ms = 4000) {
  const [elapsed, setElapsed] = useState(false)
  useEffect(() => {
    if (!active) return
    const timer = setTimeout(() => setElapsed(true), ms)
    return () => {
      clearTimeout(timer)
      setElapsed(false)
    }
  }, [active, ms])
  return active && elapsed
}
