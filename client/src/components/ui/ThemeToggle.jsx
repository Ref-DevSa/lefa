import { useState } from 'react'
import { cn } from '../../lib/cn.js'

/** @typedef {'light' | 'dark'} Theme */

const THEME_COLOURS = { light: '#1F5F4A', dark: '#0B0F1A' }

/** @returns {Theme} */
const currentTheme = () => (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light')

/** Apply and remember a theme (index.html re-applies it before the next paint). @param {Theme} theme */
function applyTheme(theme) {
  if (theme === 'dark') document.documentElement.dataset.theme = 'dark'
  else delete document.documentElement.dataset.theme
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOURS[theme])
  try {
    localStorage.setItem('lefa-theme', theme)
  } catch {
    /* storage blocked (private mode): the choice lasts for this visit only */
  }
}

/**
 * Cream (default) / midnight switch. Midnight is easier on the eyes at night
 * and on OLED phones; the choice is remembered on this device.
 * @param {{ className?: string }} props
 */
export function ThemeToggle({ className }) {
  const [theme, setTheme] = useState(currentTheme)
  const next = theme === 'dark' ? 'light' : 'dark'

  return (
    <button
      type="button"
      onClick={() => {
        applyTheme(next)
        setTheme(next)
      }}
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
      className={cn('grid size-10 place-items-center rounded-full text-muted transition-colors hover:bg-ink/5 hover:text-ink', className)}
    >
      {theme === 'dark' ? (
        // Sun: go back to cream
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      ) : (
        // Moon: switch to midnight
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true">
          <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
        </svg>
      )}
    </button>
  )
}
