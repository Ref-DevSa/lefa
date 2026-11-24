import { useId, useState } from 'react'
import { Button } from '../../components/ui/Button.jsx'
import { Card } from '../../components/ui/Card.jsx'
import { Field } from '../../components/ui/Field.jsx'
import { Modal } from '../../components/ui/Modal.jsx'
import { Select } from '../../components/ui/Select.jsx'
import { controlClass } from '../../components/ui/controlClass.js'
import { useToast } from '../../components/ui/useToast.js'
import { cn } from '../../lib/cn.js'
import { formatDate, formatZAR } from '../../lib/format.js'
import { CLAIM_STEPS, claimLabel } from '../unlock/claimFormat.js'
import { BrokerShell } from './BrokerShell.jsx'
import { useBrokerClaims, useClaimEvents, useUpdateBrokerClaim } from './queries.js'

const DAY = 24 * 60 * 60 * 1000

/** Claims pipeline (S13): a column per status; open a claim to move it on. */
export default function ClaimsPipelinePage() {
  const claims = useBrokerClaims()
  const [openId, setOpenId] = useState(/** @type {string | null} */ (null))
  const list = claims.data ?? []
  const columns = [...CLAIM_STEPS, ...(list.some((c) => c.status === 'rejected') ? ['rejected'] : [])]
  const open = list.find((c) => c.id === openId) ?? null

  return (
    <BrokerShell>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold text-ink sm:text-3xl">Claims pipeline</h1>
          <p className="mt-1 text-muted">Every claim for the families you look after, by stage. Open one to update it.</p>
        </div>

        {claims.isPending && <div aria-label="Loading claims" className="h-64 animate-pulse rounded-card bg-border/50" />}
        {claims.isError && (
          <Card className="text-center">
            <p>We couldn&apos;t load the claims.</p>
            <Button className="mt-3" onClick={() => claims.refetch()}>
              Try again
            </Button>
          </Card>
        )}
        {claims.isSuccess && list.length === 0 && (
          <Card className="text-center text-muted">No claims yet. They appear here when you verify a death.</Card>
        )}

        {list.length > 0 && (
          <div className={cn('grid gap-4', columns.length > 5 ? 'lg:grid-cols-6' : 'lg:grid-cols-5')}>
            {columns.map((status) => {
              const inColumn = list.filter((c) => c.status === status)
              return (
                <section key={status} aria-label={`${claimLabel(status)} (${inColumn.length})`} className="flex min-w-0 flex-col gap-2 rounded-card bg-border/30 p-2">
                  <h2 className="flex items-center justify-between px-1 text-sm font-semibold text-ink">
                    {claimLabel(status)}
                    <span className="rounded-full bg-surface px-2 text-xs text-muted">{inColumn.length}</span>
                  </h2>
                  {inColumn.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      aria-label={`${c.owner_name} · ${c.insurer}, ${formatZAR(c.cover_amount)}`}
                      onClick={() => setOpenId(c.id)}
                      className="flex flex-col gap-1 rounded-control border border-border bg-surface p-3 text-left text-sm shadow-soft hover:border-primary"
                    >
                      <span className="font-semibold text-ink">{c.owner_name}</span>
                      <span className="text-muted">{c.insurer}</span>
                      <span className="font-medium text-ink">{formatZAR(c.cover_amount)}</span>
                      <span className="text-xs text-muted">
                        {Math.max(0, Math.round((Date.now() - new Date(c.created_at).getTime()) / DAY))} days open
                      </span>
                    </button>
                  ))}
                  {inColumn.length === 0 && <p className="px-1 py-3 text-xs text-muted">None</p>}
                </section>
              )
            })}
          </div>
        )}
      </div>

      <ClaimPanel claim={open} onClose={() => setOpenId(null)} />
    </BrokerShell>
  )
}

/** @param {{ claim: Record<string, any> | null, onClose: () => void }} props */
function ClaimPanel({ claim, onClose }) {
  return (
    <Modal open={!!claim} onClose={onClose} title={claim ? `${claim.insurer} · ${claim.owner_name}` : ''} size="lg">
      {claim && <ClaimPanelBody key={claim.id} claim={claim} onDone={onClose} />}
    </Modal>
  )
}

/** @param {{ claim: Record<string, any>, onDone: () => void }} props */
function ClaimPanelBody({ claim, onDone }) {
  const id = useId()
  const events = useClaimEvents(claim.id)
  const update = useUpdateBrokerClaim()
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
      toast(`${claim.insurer} claim updated: ${claimLabel(status)}`, 'success')
      onDone()
    } catch (err) {
      setError(/** @type {Error} */ (err).message)
    }
  }

  const closed = claim.status === 'paid' || claim.status === 'rejected'
  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-muted">
        Policy {claim.policy_number} · {formatZAR(claim.cover_amount)} · now <strong className="text-ink">{claimLabel(claim.status)}</strong>
      </p>

      {closed ? (
        <p className="rounded-control bg-cream px-3 py-2 text-sm text-muted">This claim is closed. An admin can reopen it if needed.</p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3" aria-label="Update claim">
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          <Select id={`${id}-status`} label="New status" options={options} value={status} onChange={(e) => setStatus(e.target.value)} />
          <Field id={`${id}-note`} label="Note (optional)" helper="Visible to the family on their claim timeline.">
            {(aria) => (
              <textarea {...aria} rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} className={cn(controlClass, 'border-border py-2')} />
            )}
          </Field>
          <Button type="submit" className="self-start" loading={update.isPending}>
            Update
          </Button>
        </form>
      )}

      <div>
        <h3 className="mb-2 text-sm font-semibold text-ink">Timeline</h3>
        {events.isPending && <p className="text-sm text-muted">Loading…</p>}
        <ol className="flex flex-col gap-3 border-l-2 border-border pl-4">
          {[...(events.data ?? [])].reverse().map((/** @type {any} */ e) => (
            <li key={e.id} className="text-sm">
              <p className="font-medium text-ink">
                {e.from_status ? `${claimLabel(e.from_status)} → ${claimLabel(e.to_status)}` : 'Claim opened'}
                <span className="font-normal text-muted"> · {formatDate(e.created_at)}</span>
              </p>
              {e.note && <p className="text-muted">{e.note}</p>}
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}
