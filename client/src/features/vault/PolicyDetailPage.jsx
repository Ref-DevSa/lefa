import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { Button } from '../../components/ui/Button.jsx'
import { Card } from '../../components/ui/Card.jsx'
import { Modal } from '../../components/ui/Modal.jsx'
import { useToast } from '../../components/ui/useToast.js'
import { formatDate, formatZAR } from '../../lib/format.js'
import { MemberShell } from './MemberShell.jsx'
import { PolicyFormModal } from './PolicyFormModal.jsx'
import { PolicyStatusPill, TypePill } from './PolicyPills.jsx'
import { ordinal, statusLabel, typeLabel } from './policyFormat.js'
import { useDeletePolicy, usePolicy } from './queries.js'
import { ClaimChecklist } from '../documents/ClaimChecklist.jsx'

function BackLink() {
  return (
    <Link to="/vault" className="inline-flex min-h-11 items-center gap-1 font-medium text-primary hover:underline">
      <span aria-hidden="true">←</span> Back to My Vault
    </Link>
  )
}

/** Policy detail (S5). */
export default function PolicyDetailPage() {
  const { id = '' } = useParams()
  const policy = usePolicy(id)
  const [editing, setEditing] = useState(false)
  const [confirming, setConfirming] = useState(false)

  if (policy.isPending) {
    return (
      <MemberShell>
        <BackLink />
        <div aria-busy="true" aria-label="Loading policy" className="mt-4 h-64 animate-pulse rounded-card bg-border/50" />
      </MemberShell>
    )
  }

  if (policy.isError) {
    const missing = /** @type {any} */ (policy.error).status === 404
    return (
      <MemberShell>
        <BackLink />
        <Card className="mt-4 flex flex-col items-center gap-3 py-10 text-center">
          <h1 className="text-xl font-semibold text-ink">{missing ? "We couldn't find that policy" : "We couldn't load this policy"}</h1>
          <p className="text-muted">
            {missing ? 'It may have been removed, or the link is wrong.' : `${policy.error.message} Your policies are safe.`}
          </p>
          {!missing && <Button onClick={() => policy.refetch()}>Try again</Button>}
        </Card>
      </MemberShell>
    )
  }

  const p = policy.data
  return (
    <MemberShell>
      <BackLink />
      <div className="mt-4 flex flex-col gap-6">
        <Card className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-2 flex flex-wrap gap-2">
              <TypePill type={p.type} />
              <PolicyStatusPill status={p.status} />
            </div>
            <h1 className="text-2xl font-bold text-ink sm:text-3xl">{p.insurer}</h1>
            <p className="mt-1 text-muted">
              {typeLabel(p.type)} cover · added {formatDate(p.created_at)}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setEditing(true)}>
              Edit policy
            </Button>
            <Button variant="ghost" className="text-danger hover:bg-danger/5" onClick={() => setConfirming(true)}>
              Remove
            </Button>
          </div>
        </Card>

        {p.status === 'lapsed' && (
          <div role="note" aria-label="Lapsed policy" className="rounded-card border border-warning/30 bg-warning/5 px-4 py-3">
            <p className="font-semibold text-warning">This policy has lapsed</p>
            <p className="mt-1 text-sm text-ink">
              It won&apos;t pay out as things stand. Call {p.insurer} to ask whether it can be reinstated.
            </p>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          <Card as="section" aria-labelledby="info-heading" className="lg:col-span-2">
            <h2 id="info-heading" className="mb-4 text-lg font-semibold text-ink">
              Policy information
            </h2>
            <dl className="grid gap-3 sm:grid-cols-2">
              <Detail label="Policy number" value={<span className="font-mono">{p.policy_number}</span>} />
              <Detail label="Cover amount" value={<span className="text-xl font-bold text-primary">{formatZAR(p.cover_amount)}</span>} />
              <Detail label="Monthly premium" value={formatZAR(p.monthly_premium)} />
              <Detail label="Debit day" value={p.debit_day ? `${ordinal(p.debit_day)} of every month` : 'Not set'} />
              <Detail label="Status" value={statusLabel(p.status)} />
              <Detail label="Type" value={typeLabel(p.type)} />
              <Detail label="Beneficiaries" value={p.beneficiaries || 'Not recorded'} wide />
              <Detail label="Notes" value={p.notes || 'No notes'} wide />
              <Detail label="Last updated" value={formatDate(p.updated_at)} />
            </dl>
          </Card>

          <ClaimChecklist policyId={p.id} />
        </div>
      </div>

      <PolicyFormModal open={editing} onClose={() => setEditing(false)} policy={p} />
      <ConfirmRemove open={confirming} onClose={() => setConfirming(false)} policy={p} />
    </MemberShell>
  )
}

/** @param {{ label: string, value: React.ReactNode, wide?: boolean }} props */
function Detail({ label, value, wide }) {
  return (
    <div className={wide ? 'rounded-control bg-cream px-3 py-2.5 sm:col-span-2' : 'rounded-control bg-cream px-3 py-2.5'}>
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="mt-0.5 break-words text-ink">{value}</dd>
    </div>
  )
}

/** @param {{ open: boolean, onClose: () => void, policy: Record<string, any> }} props */
function ConfirmRemove({ open, onClose, policy }) {
  const remove = useDeletePolicy()
  const navigate = useNavigate()
  const toast = useToast()

  async function handleRemove() {
    try {
      await remove.mutateAsync(policy.id)
      toast(`${policy.insurer} policy removed`, 'success')
      navigate('/vault', { replace: true })
    } catch (err) {
      toast(/** @type {Error} */ (err).message || 'Something went wrong. Try again.', 'error')
      onClose()
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Remove this policy?"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Keep it
          </Button>
          <Button variant="danger" loading={remove.isPending} onClick={handleRemove}>
            Remove policy
          </Button>
        </>
      }
    >
      <p>
        {policy.insurer} ({policy.policy_number}) will be removed from your vault. This can&apos;t be undone.
      </p>
    </Modal>
  )
}
