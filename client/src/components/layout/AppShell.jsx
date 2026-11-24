import { NavLink } from 'react-router'
import { cn } from '../../lib/cn.js'
import { Logo } from './Logo.jsx'
import { ThemeToggle } from '../ui/ThemeToggle.jsx'

/** @typedef {{ to: string, label: string, shortLabel?: string, icon?: React.ReactNode, end?: boolean }} NavItem  end: exact match; shortLabel: phone tab bar */

/**
 * Signed-in layout: top nav on desktop, bottom tab bar on mobile.
 * @param {{ navItems: NavItem[], actions?: React.ReactNode, children: React.ReactNode }} props
 */
export function AppShell({ navItems, actions, children }) {
  return (
    <div className="min-h-screen bg-cream">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-surface focus:px-3 focus:py-2">
        Skip to content
      </a>
      <header className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
          <Logo to={navItems[0]?.to ?? '/'} />
          <nav aria-label="Main" className="hidden md:block">
            <ul className="flex gap-1">
              {navItems.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      cn(
                        'rounded-control px-3 py-2 font-medium',
                        isActive ? 'bg-primary/10 text-primary' : 'text-muted hover:text-ink',
                      )
                    }
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            {actions}
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-6xl px-4 pb-24 pt-6 md:pb-10">
        {children}
      </main>

      <nav aria-label="Tabs" className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface md:hidden">
        <ul className="flex">
          {navItems.map((item) => (
            <li key={item.to} className="flex-1">
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs font-medium',
                    isActive ? 'text-primary' : 'text-muted',
                  )
                }
              >
                {item.icon && <span aria-hidden="true">{item.icon}</span>}
                {item.shortLabel ?? item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
