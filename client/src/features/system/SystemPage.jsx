import { Link } from 'react-router'
import { Logo } from '../../components/layout/Logo.jsx'
import { ThemeToggle } from '../../components/ui/ThemeToggle.jsx'

/**
 * Shared layout for 403 / 404 / error states (S14).
 * @param {{ code?: string, title: string, message: string, actionTo: string, actionLabel: string, icon: React.ReactNode }} props
 */
export function SystemPage({ code, title, message, actionTo, actionLabel, icon }) {
  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4">
        <Logo />
        <ThemeToggle />
      </header>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 pb-16 text-center">
        <span aria-hidden="true" className="text-accent">
          {icon}
        </span>
        {code && <p className="text-sm font-semibold tracking-widest text-muted">{code}</p>}
        <h1 className="text-2xl font-bold text-ink">{title}</h1>
        <p className="text-muted">{message}</p>
        <Link
          to={actionTo}
          className="inline-flex min-h-11 items-center justify-center rounded-control bg-primary px-5 font-semibold text-on-primary hover:bg-primary-hover"
        >
          {actionLabel}
        </Link>
      </main>
    </div>
  )
}
