import { Logo } from '../../components/layout/Logo.jsx'
import { ThemeToggle } from '../../components/ui/ThemeToggle.jsx'

/**
 * S2 split layout: a calm cream panel with the promise on the left (desktop),
 * the form on the right. On mobile only the form shows, under the logo.
 * @param {{ title: string, subtitle: string, children: React.ReactNode }} props
 */
export function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="grid min-h-screen bg-surface lg:grid-cols-2">
      <aside className="hidden flex-col justify-between bg-cream p-10 lg:flex">
        <Logo />
        <div className="mx-auto max-w-sm text-center">
          <svg viewBox="0 0 96 96" className="mx-auto mb-8 size-28 text-primary" aria-hidden="true">
            <rect x="8" y="8" width="80" height="80" rx="20" fill="currentColor" opacity="0.08" />
            <path d="M48 20 24 30v16c0 15 10 26 24 30 14-4 24-15 24-30V30L48 20Z" fill="currentColor" />
            <circle cx="48" cy="44" r="6" fill="#C8902E" />
            <path d="M45 48h6l2 12h-10l2-12Z" fill="#C8902E" />
          </svg>
          <p className="font-display text-3xl leading-snug text-ink">
            Make sure your cover <em className="text-primary">reaches</em> your family
          </p>
        </div>
        <div aria-hidden="true" className="litema -mx-10 h-10 bg-accent/40" />
        <p className="flex items-center gap-2 text-sm text-muted">
          <svg viewBox="0 0 24 24" className="size-4 text-accent" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <rect x="5" y="11" width="14" height="10" rx="2" />
            <path d="M8 11V8a4 4 0 0 1 8 0v3" />
          </svg>
          Private by design. Your nominee sees nothing until a death is verified.
        </p>
      </aside>

      <main className="relative flex flex-col px-4 py-6 sm:px-8 lg:justify-center">
        <div className="flex items-center justify-between lg:absolute lg:top-6 lg:right-8">
          <div className="lg:hidden">
            <Logo />
          </div>
          <ThemeToggle />
        </div>
        <div className="mx-auto w-full max-w-md pt-10 lg:pt-0">
          <h1 className="text-3xl font-bold text-ink">{title}</h1>
          <p className="mt-2 text-muted">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </main>
    </div>
  )
}
