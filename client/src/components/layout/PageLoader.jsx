/** Full-page "please wait" state while we check who is logged in. */
export function PageLoader({ label = 'Loading…' }) {
  return (
    <div role="status" className="flex min-h-screen flex-col items-center justify-center gap-3 bg-cream text-muted">
      <span
        aria-hidden="true"
        className="size-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary"
      />
      <span>{label}</span>
    </div>
  )
}
