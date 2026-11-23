import { cn } from '../../lib/cn.js'

/** Shared base classes for text inputs and selects. */
export const controlClass = cn(
  'w-full min-h-11 rounded-[var(--radius-control)] border bg-surface px-3 text-base text-ink',
  'placeholder:text-muted/70 focus:outline-2 focus:outline-offset-0 focus:outline-primary',
  'disabled:bg-cream disabled:text-muted',
)
