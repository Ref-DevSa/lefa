import { useId } from 'react'
import { Link } from 'react-router'
import { Card } from '../../components/ui/Card.jsx'
import { formatZAR } from '../../lib/format.js'
import { PolicyStatusPill, TypePill } from './PolicyPills.jsx'
import { initials, maskPolicyNumber, ordinal } from './policyFormat.js'

/** One policy on My Vault (S3). @param {{ policy: Record<string, any> }} props */
export function PolicyCard({ policy }) {
  const headingId = useId()
  const schedule = policy.debit_day
    ? `${formatZAR(policy.monthly_premium)} · debits on the ${ordinal(policy.debit_day)}`
    : `${formatZAR(policy.monthly_premium)} a month`

  return (
    <Card as="article" aria-label={policy.insurer} aria-labelledby={headingId} className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-control bg-primary/10 font-bold text-primary">
            {initials(policy.insurer)}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 id={headingId} className="truncate text-lg font-semibold text-ink">
                {policy.insurer}
              </h3>
              <TypePill type={policy.type} />
            </div>
            <p className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-muted">
              <span>
                Policy no. <span className="font-mono">{maskPolicyNumber(policy.policy_number)}</span>
              </span>
              <PolicyStatusPill status={policy.status} />
            </p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-xs font-medium tracking-wide text-muted uppercase">Cover</p>
          <p className="text-xl font-bold text-ink">{formatZAR(policy.cover_amount)}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-control bg-cream px-3 py-2.5">
        <div>
          <p className="text-xs text-muted">Premium</p>
          <p className="font-medium text-ink">{schedule}</p>
        </div>
        <Link
          to={`/vault/policies/${policy.id}`}
          aria-label={`View ${policy.insurer} policy`}
          className="inline-flex min-h-11 items-center gap-1 rounded-control px-3 font-semibold text-primary hover:bg-primary/5"
        >
          View policy <span aria-hidden="true">→</span>
        </Link>
      </div>
    </Card>
  )
}
