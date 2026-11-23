import { cn } from '../../lib/cn.js'
import { CLAIM_STATUS } from '../../lib/claimStatus.js'

/** @param {{ status: keyof typeof CLAIM_STATUS | string }} props */
export function StatusPill({ status }) {
  const s = CLAIM_STATUS[/** @type {keyof typeof CLAIM_STATUS} */ (status)] ?? {
    label: status,
    className: 'bg-muted/10 text-muted',
  }
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-sm font-medium', s.className)}>
      {s.label}
    </span>
  )
}
