import { useId, useState } from 'react'
import { Link, useParams } from 'react-router'
import { Button } from '../../components/ui/Button.jsx'
import { Card } from '../../components/ui/Card.jsx'
import { Field } from '../../components/ui/Field.jsx'
import { Select } from '../../components/ui/Select.jsx'
import { StatusPill } from '../../components/ui/StatusPill.jsx'
import { controlClass } from '../../components/ui/controlClass.js'
import { useToast } from '../../components/ui/useToast.js'
import { cn } from '../../lib/cn.js'
import { formatDate, formatZAR } from '../../lib/format.js'
import { docTypeLabel } from '../documents/docFormat.js'
import { useOpenDocument } from '../documents/useOpenDocument.js'
import { LockNote } from '../nominees/LockNote.jsx'
import { MemberShell } from '../vault/MemberShell.jsx'
import { TypePill } from '../vault/PolicyPills.jsx'
import { CLAIM_STEPS, claimLabel, claimSummary, stepState } from './claimFormat.js'
import { useUpdateClaim, useVault } from './queries.js'

function BackLink() {
  return (
    <Link to="/nominated" className="inline-flex min-h-11 items-center gap-1 font-medium text-primary hover:underline">
      <span aria-hidden="true">←</span> Nominated for me
    </Link>
  )
}

/** Unlocked vault & claims (S10): read-only policies, documents, and a tracker per claim. */
export default function UnlockedVaultPage() {
  const { ownerId = '' } = useParams()
  const vault = useVault(ownerId)

  if (vault.isPending) {
    return (
      <MemberShell>
        <BackLink />
        <div aria-label="Loading vault" className="mt-4 h-72 animate-pulse rounded-card bg-border/50" />
      </MemberShell>
    )
  }
  if (vault.isError) {
    const lockedVault = /** @type {any} */ (vault.error).status === 403
    return (
      <MemberShell>
        <BackLink />
        <Card className="mt-4 flex flex-col items-center gap-3 py-10 text-center">
          <h1 className="text-xl font-semibold text-ink">{lockedVault ? 'This vault is still locked' : "We couldn't open this vault"}</h1>
          <p className="max-w-md text-muted">
            {lockedVault
              ? 'It opens once a broker has verified the death. If you have reported it, the broker is checking the certificate.'
              : `${vault.error.message} Try again in a moment.`}
          </p>
          {!lockedVault && <Button onClick={() => vault.refetch()}>Try again</Button>}
        </Card>
      </MemberShell>
    )
  }

  const v = vault.data
  const summary = claimSummary(v)
  const unclaimed = v.policies.filter((/** @type {any} */ p) => !v.claims.some((/** @type {any} */ c) => c.policy_id === p.id))

  return (
    <MemberShell>
      <BackLink />
      <div className="mt-4 flex flex-col gap-6">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <div className="mb-2 flex flex-wrap gap-2 text-sm">
              <span className="rounded-full bg-success/10 px-2.5 py-0.5 font-medium text-success">Verified {formatDate(v.report.reviewed_at ?? v.report.date_of_death)}</span>
              <span className="rounded-full bg-muted/10 px-2.5 py-0.5 font-medium text-ink">Read-only · nominee access</span>
            </div>
            <h1 className="text-2xl font-bold text-ink sm:text-3xl">{v.owner.full_name}&rsquo;s vault</h1>
            <p className="mt-1 max-w-2xl text-muted">
              Every policy {v.owner.full_name.split(' ')[0]} recorded is below, with a claim for each one that can pay out.
              Update each claim as it moves, so the family always knows where things stand.
            </p>
          </div>
          <Card as="section" aria-label="Claims summary" className="lg:min-w-72">
            <p className="text-sm text-muted">Cover being claimed</p>
            <p className="text-3xl font-bold text-primary">{formatZAR(summary.totalCover)}</p>
            <p className="text-sm text-muted">
              {summary.claims} claim{summary.claims === 1 ? '' : 's'} · {summary.paid} paid{summary.paid ? ` (${formatZAR(summary.paidCover)})` : ''}
            </p>
          </Card>
        </div>

        {v.claims.map((/** @type {any} */ claim) => (
          <ClaimCard key={claim.id} claim={claim} vault={v} />
        ))}

        {unclaimed.length > 0 && (
          <Card as="section" aria-labelledby="unclaimed-heading">
            <h2 id="unclaimed-heading" className="text-lg font-semibold text-ink">
              Policies without a claim
            </h2>
            <ul className="mt-3 flex flex-col gap-2">
              {unclaimed.map((/** @type {any} */ p) => (
                <li key={p.id} className="rounded-control bg-cream px-3 py-2.5 text-sm">
                  <span className="font-medium text-ink">
                    {p.insurer} ({p.policy_number}) · {formatZAR(p.cover_amount)}
                  </span>
                  <span className="block text-muted">
                    {p.status === 'lapsed'
                      ? 'This policy had lapsed, so it may not pay out. Call the insurer to check before giving up on it.'
                      : 'No claim was opened for this policy. Ask the broker.'}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </MemberShell>
  )
}

/** @param {{ claim: Record<string, any>, vault: Record<string, any> }} props */
function ClaimCard({ claim, vault }) {
  const policy = vault.policies.find((/** @type {any} */ p) => p.id === claim.policy_id) ?? {}
  // The policy's own documents, plus person-wide ones (ID, bank letter) that every claim needs.
  const docs = vault.documents.filter((/** @type {any} */ d) => d.policy_id === claim.policy_id || d.policy_id === null)
  const open = useOpenDocument(vault.owner.id)
  const [showHistory, setShowHistory] = useState(false)
  const [updating, setUpdating] = useState(false)

  return (
    <Card as="article" aria-label={`${policy.insurer} claim`} className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex flex-wrap items-center gap-2 text-sm text-muted">
            Policy <span className="font-mono text-ink">{policy.policy_number}</span>
            <TypePill type={policy.type} />
          </p>
          <h2 className="mt-1 text-xl font-semibold text-ink">{policy.insurer}</h2>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-ink">{formatZAR(policy.cover_amount)}</p>
          <StatusPill status={claim.status} />
        </div>
      </div>

      <Stepper status={claim.status} />

      {updating ? (
        <UpdateClaimForm claim={claim} insurer={policy.insurer} onDone={() => setUpdating(false)} />
      ) : (
        claim.status !== 'paid' &&
        claim.status !== 'rejected' && (
          <Button variant="secondary" className="self-start" onClick={() => setUpdating(true)}>
            Update status
          </Button>
        )
      )}

      <div>
        <h3 className="text-sm font-semibold text-ink">Documents for this claim ({docs.length})</h3>
        {docs.length === 0 ? (
          <p className="mt-1 text-sm text-muted">No documents were uploaded. The insurer will tell you what they need.</p>
        ) : (
          <ul className="mt-2 grid gap-2 sm:grid-cols-2">
            {docs.map((/** @type {any} */ d) => (
              <li key={d.id} className="flex min-w-0 items-center justify-between gap-2 rounded-control bg-cream px-3 py-2">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-ink">{d.file_name}</span>
                  <span className="text-xs text-muted">{docTypeLabel(d.doc_type)}</span>
                </span>
                <Button size="sm" variant="ghost" aria-label={`View ${d.file_name}`} onClick={() => open(d)}>
                  View
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <button
          type="button"
          aria-expanded={showHistory}
          onClick={() => setShowHistory((s) => !s)}
          className="text-sm font-semibold text-primary hover:underline"
        >
          {showHistory ? 'Hide history' : `Show history (${claim.events.length} update${claim.events.length === 1 ? '' : 's'})`}
        </button>
        {showHistory && (
          <ol className="mt-3 flex flex-col gap-3 border-l-2 border-border pl-4">
            {[...claim.events].reverse().map((/** @type {any} */ e) => (
              <li key={e.id} className="text-sm">
                <p className="font-medium text-ink">
                  {e.from_status ? `${claimLabel(e.from_status)} → ${claimLabel(e.to_status)}` : `Claim opened (${claimLabel(e.to_status)})`}
                  <span className="font-normal text-muted"> · {formatDate(e.created_at)}</span>
                </p>
                {e.note && <p className="text-muted">{e.note}</p>}
              </li>
            ))}
          </ol>
        )}
      </div>
    </Card>
  )
}

/** Not started → Submitted → Documents requested → Approved → Paid. @param {{ status: string }} props */
function Stepper({ status }) {
  if (status === 'rejected') {
    return (
      <LockNote className="border-danger/30 bg-danger/5">
        <strong>The insurer rejected this claim.</strong> Ask the broker about appealing, or check the policy wording.
      </LockNote>
    )
  }
  return (
    <ol className="flex flex-col gap-1 rounded-card bg-cream p-2 text-sm sm:grid sm:grid-cols-5 sm:text-center" aria-label="Claim progress">
      {stepState(status).map((s, i) => (
        <li
          key={s.step}
          aria-label={`${s.label}${s.state === 'current' ? ' (current step)' : s.state === 'done' ? ' (done)' : ''}`}
          aria-current={s.state === 'current' ? 'step' : undefined}
          className={cn('flex items-center gap-2 rounded-control px-2 py-1.5 sm:flex-col sm:gap-1 sm:px-1 sm:py-2', s.state === 'current' && 'bg-surface shadow-soft')}
        >
          <span
            aria-hidden="true"
            className={cn(
              'grid size-6 place-items-center rounded-full text-xs font-bold',
              s.state === 'done' && 'bg-success text-on-primary',
              s.state === 'current' && 'bg-primary text-on-primary',
              s.state === 'upcoming' && 'border border-border bg-surface text-muted',
            )}
          >
            {s.state === 'done' ? '✓' : i + 1}
          </span>
          <span className={cn(s.state === 'upcoming' ? 'text-muted' : 'font-medium text-ink')}>{s.label}</span>
        </li>
      ))}
    </ol>
  )
}

/** @param {{ claim: Record<string, any>, insurer: string, onDone: () => void }} props */
function UpdateClaimForm({ claim, insurer, onDone }) {
  const id = useId()
  const update = useUpdateClaim()
  const toast = useToast()
  const options = [...CLAIM_STEPS, 'rejected'].filter((s) => s !== claim.status).map((s) => ({ value: s, label: claimLabel(s) }))
  const [status, setStatus] = useState(options[0]?.value ?? '')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

  /** @param {React.FormEvent<HTMLFormElement>} e */
  async function handleSubmit(e) {
    e.preventDefault()
    try {
      await update.mutateAsync({ id: claim.id, status, note: note.trim() })
      toast(`${insurer} claim updated: ${claimLabel(status)}`, 'success')
      onDone()
    } catch (err) {
      setError(/** @type {Error} */ (err).message)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-card border border-border p-4" aria-label={`Update the ${insurer} claim`}>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <Select id={`${id}-status`} label="New status" options={options} value={status} onChange={(e) => setStatus(e.target.value)} />
      <Field id={`${id}-note`} label="Note (optional)" helper="E.g. what the insurer said, or what they asked for.">
        {(aria) => (
          <textarea {...aria} rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} className={cn(controlClass, 'border-border py-2')} />
        )}
      </Field>
      <div className="flex gap-2">
        <Button type="submit" loading={update.isPending}>
          Save
        </Button>
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
