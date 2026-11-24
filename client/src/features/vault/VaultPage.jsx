import { useState } from 'react'
import { Button } from '../../components/ui/Button.jsx'
import { Card } from '../../components/ui/Card.jsx'
import { EmptyState } from '../../components/ui/EmptyState.jsx'
import { StatTile } from '../../components/ui/StatTile.jsx'
import { cn } from '../../lib/cn.js'
import { formatZAR } from '../../lib/format.js'
import { useSlow } from '../../lib/useSlow.js'
import { useAuth } from '../auth/useAuth.js'
import { MemberShell } from './MemberShell.jsx'
import { PolicyCard } from './PolicyCard.jsx'
import { PolicyFormModal } from './PolicyFormModal.jsx'
import { POLICY_TYPES, nextDebit } from './policyFormat.js'
import { usePolicies, useVaultSummary } from './queries.js'
import { checklistFor, readiness } from '../documents/docFormat.js'
import { useDocuments } from '../documents/queries.js'
import { NomineePanel } from '../nominees/NomineePanel.jsx'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** My Vault (S3): totals, lapse warning, and a card per policy. */
export default function VaultPage() {
  const { profile } = useAuth()
  const policies = usePolicies()
  const summary = useVaultSummary()
  const documents = useDocuments()
  const [adding, setAdding] = useState(false)
  const slow = useSlow(policies.isPending)
  const firstName = profile?.full_name.split(' ')[0] || 'there'
  const list = policies.data ?? []

  return (
    <MemberShell>
      <div className="flex flex-col gap-6">
        <Card className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-ink sm:text-3xl">Dumela, {firstName}</h1>
            <p className="mt-1 text-muted">Every policy your family pays for, in one place.</p>
          </div>
          {list.length > 0 && (
            <Button onClick={() => setAdding(true)}>
              <span aria-hidden="true">+</span> Add policy
            </Button>
          )}
        </Card>

        {policies.isPending && <VaultLoading slow={slow} />}

        {policies.isError && (
          <Card className="flex flex-col items-center gap-3 py-10 text-center">
            <h2 className="text-lg font-semibold text-ink">We couldn&apos;t load your vault</h2>
            <p className="text-muted">{policies.error.message} Your policies are safe.</p>
            <Button
              onClick={() => {
                policies.refetch()
                summary.refetch()
              }}
            >
              Try again
            </Button>
          </Card>
        )}

        {policies.isSuccess && list.length === 0 && (
          <EmptyState
            title="Add your first policy"
            description="It takes 2 minutes. Start with the funeral policy you pay for every month. Your family will thank you."
            action={<Button onClick={() => setAdding(true)}>Add your first policy</Button>}
          />
        )}

        {policies.isSuccess && list.length > 0 && (
          <>
            <Totals summary={summary.data} policies={list} documents={documents.data} />
            <LapsedWarning policies={list} />
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
              <PolicyList policies={list} documents={documents.data} />
              <div className="xl:pt-12">
                <NomineePanel />
              </div>
            </div>
          </>
        )}
      </div>

      <PolicyFormModal open={adding} onClose={() => setAdding(false)} />
    </MemberShell>
  )
}

/**
 * @param {{ summary?: import('../../lib/api.js').VaultSummary, policies: Array<Record<string, any>>,
 *   documents?: Array<Record<string, any>> }} props
 */
function Totals({ summary, policies, documents }) {
  const next = nextDebit(/** @type {any} */ (policies), new Date())
  const lapsed = policies.filter((p) => p.status === 'lapsed').length
  const docs = documents ? readiness(policies, /** @type {any} */ (documents)) : null
  return (
    <section aria-label="Vault totals" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatTile
        label="Total active cover"
        value={summary ? formatZAR(summary.total_active_cover) : '…'}
        hint={summary ? `across ${summary.insurer_count} insurer${summary.insurer_count === 1 ? '' : 's'}` : undefined}
      />
      <StatTile
        label="Monthly premiums"
        value={summary ? formatZAR(summary.monthly_premiums) : '…'}
        hint={summary ? `${summary.active_count} active${lapsed ? ` · ${lapsed} lapsed` : ''}` : undefined}
      />
      <StatTile
        label="Claim-ready docs"
        value={docs ? `${docs.ready} of ${docs.needed}` : '…'}
        hint={docs && docs.ready < docs.needed ? 'ID, bank letter and schedules' : 'All documents ready'}
      />
      <StatTile
        label="Next debit"
        value={next ? `${next.date.getDate()} ${MONTHS[next.date.getMonth()]}` : 'Not set'}
        hint={next ? `${formatZAR(next.amount)} · ${next.insurers.join(', ')}` : 'Add debit days to see this'}
      />
    </section>
  )
}

/**
 * Lapsed cover won't pay out, so say so plainly. Spotting a lapse early is
 * often the difference between reinstating a policy and losing it.
 * @param {{ policies: Array<Record<string, any>> }} props
 */
function LapsedWarning({ policies }) {
  const lapsed = policies.filter((p) => p.status === 'lapsed')
  if (!lapsed.length) return null
  const names = lapsed.map((p) => p.insurer).join(', ')
  return (
    <div role="note" aria-label="Lapsed policies" className="rounded-card border border-warning/30 bg-warning/5 px-4 py-3 text-ink">
      <p className="font-semibold text-warning">
        {lapsed.length === 1 ? '1 policy has lapsed' : `${lapsed.length} policies have lapsed`}: {names}
      </p>
      <p className="mt-1 text-sm">
        Lapsed cover won&apos;t pay out. Call the insurer soon to ask whether it can be reinstated, or make sure you&apos;re
        not still paying for it.
      </p>
    </div>
  )
}

/** @param {{ policies: Array<Record<string, any>>, documents?: Array<Record<string, any>> }} props */
function PolicyList({ policies, documents }) {
  const [filter, setFilter] = useState('all')
  const types = POLICY_TYPES.filter((t) => policies.some((p) => p.type === t.value))
  const shown = filter === 'all' ? policies : policies.filter((p) => p.type === filter)
  const chips = [{ value: 'all', label: 'All', count: policies.length }].concat(
    types.map((t) => ({ ...t, count: policies.filter((p) => p.type === t.value).length })),
  )

  return (
    <section aria-labelledby="policies-heading" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="policies-heading" className="text-xl font-semibold text-ink">
          Your policies <span className="font-normal text-muted">({policies.length})</span>
        </h2>
        {types.length > 1 && (
          <div role="group" aria-label="Filter by type" className="flex flex-wrap gap-1 rounded-control bg-surface p-1 shadow-soft">
            {chips.map((c) => (
              <button
                key={c.value}
                type="button"
                aria-pressed={filter === c.value}
                onClick={() => setFilter(c.value)}
                className={cn(
                  'min-h-9 rounded-[8px] px-3 text-sm font-medium',
                  filter === c.value ? 'bg-primary text-on-primary' : 'text-muted hover:text-ink',
                )}
              >
                {c.label} ({c.count})
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {shown.map((p) => (
          <PolicyCard
            key={p.id}
            policy={p}
            docsReady={documents ? checklistFor(p.id, /** @type {any} */ (documents)).filter((i) => i.done).length : undefined}
          />
        ))}
      </div>
    </section>
  )
}

/** Skeleton while loading, plus a reassuring note if the API is waking up. */
function VaultLoading({ slow }) {
  return (
    <div aria-busy="true" aria-label="Loading your vault" className="flex flex-col gap-4">
      {slow && (
        <p className="rounded-control bg-info/5 px-4 py-3 text-sm text-info">
          Waking up Lefa&apos;s server. After a quiet spell the first load can take up to a minute.
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-card bg-border/50" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="h-40 animate-pulse rounded-card bg-border/50" />
        ))}
      </div>
    </div>
  )
}
