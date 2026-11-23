/**
 * @param {{ title: string, description?: string, action?: React.ReactNode, icon?: React.ReactNode }} props
 */
export function EmptyState({ title, description, action, icon }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-card border border-dashed border-border px-6 py-12 text-center">
      <span aria-hidden="true" className="text-accent">
        {icon ?? (
          <svg viewBox="0 0 48 48" className="size-12" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="8" y="14" width="32" height="24" rx="4" />
            <path d="M18 14v-3a6 6 0 0 1 12 0v3" />
            <circle cx="24" cy="26" r="3" />
          </svg>
        )}
      </span>
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      {description && <p className="max-w-sm text-muted">{description}</p>}
      {action}
    </div>
  )
}
