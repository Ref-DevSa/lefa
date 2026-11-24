import { cn } from '../../lib/cn.js'

/** The privacy promise, with a lock. @param {{ children: React.ReactNode, className?: string }} props */
export function LockNote({ children, className }) {
  return (
    <div className={cn('flex items-start gap-3 rounded-card border border-primary/20 bg-primary/5 p-4 text-ink', className)}>
      <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="5" y="11" width="14" height="10" rx="2" />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" />
        </svg>
      </span>
      <div className="text-sm leading-relaxed">{children}</div>
    </div>
  )
}
