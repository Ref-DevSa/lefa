import { cn } from '../../lib/cn.js'
import { statusLabel, typeLabel } from './policyFormat.js'

const STATUS_STYLES = {
  active: 'bg-success/10 text-success',
  lapsed: 'bg-danger/10 text-danger',
  paid_up: 'bg-info/10 text-info',
}

/** @param {{ children: React.ReactNode, className?: string }} props */
function Pill({ children, className }) {
  return <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-sm font-medium', className)}>{children}</span>
}

/** @param {{ type: string }} props */
export function TypePill({ type }) {
  return <Pill className="bg-accent/15 text-ink">{typeLabel(type)}</Pill>
}

/** @param {{ status: string }} props */
export function PolicyStatusPill({ status }) {
  return (
    <Pill className={STATUS_STYLES[/** @type {keyof typeof STATUS_STYLES} */ (status)] ?? 'bg-muted/10 text-muted'}>
      {statusLabel(status)}
    </Pill>
  )
}
