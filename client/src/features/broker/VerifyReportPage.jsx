import { useId, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { Button } from '../../components/ui/Button.jsx'
import { Card } from '../../components/ui/Card.jsx'
import { Field } from '../../components/ui/Field.jsx'
import { Modal } from '../../components/ui/Modal.jsx'
import { controlClass } from '../../components/ui/controlClass.js'
import { useToast } from '../../components/ui/useToast.js'
import { cn } from '../../lib/cn.js'
import { formatDate, formatZAR } from '../../lib/format.js'
import { relationshipLabel } from '../nominees/nomineeFormat.js'
import { BrokerShell } from './BrokerShell.jsx'
import { useRejectReport, useReport, useVerifyReport } from './queries.js'

function BackLink() {
  return (
    <Link to="/broker" className="inline-flex min-h-11 items-center gap-1 font-medium text-primary hover:underline">
      <span aria-hidden="true">←</span> Dashboard
    </Link>
  )
}

/** Verify death report (S12): certificate beside the facts; verify or reject. */
export default function VerifyReportPage() {
  const { id = '' } = useParams()
  const report = useReport(id)
  const [verifying, setVerifying] = useState(false)
  const [rejecting, setRejecting] = useState(false)

  if (report.isPending) {
    return (
      <BrokerShell>
        <BackLink />
        <div aria-label="Loading report" className="mt-4 h-96 animate-pulse rounded-card bg-border/50" />
      </BrokerShell>
    )
  }
  if (report.isError) {
    return (
      <BrokerShell>
        <BackLink />
        <Card className="mt-4 text-center">
          <h1 className="text-xl font-semibold text-ink">We couldn&apos;t open this report</h1>
          <p className="mt-2 text-muted">It may belong to a family you don&apos;t look after, or the link is wrong.</p>
        </Card>
      </BrokerShell>
    )
  }

  const r = report.data
  const reporter = `${r.reporter.full_name}${r.reporter.relationship ? ` (${relationshipLabel(r.reporter.relationship).toLowerCase()})` : ''}`
  const claimCount = r.policies.filter((/** @type {any} */ p) => p.will_claim).length

  return (
    <BrokerShell>
      <BackLink />
      <div className="mt-4 flex flex-col gap-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-ink sm:text-3xl">Death report: {r.owner.full_name}</h1>
            <p className="mt-1 text-muted">Submitted {formatDate(r.created_at)} by {reporter}</p>
          </div>
          {r.status === 'pending' ? (
            <div className="flex gap-2">
              <Button variant="danger" onClick={() => setRejecting(true)}>
                Reject
              </Button>
              <Button onClick={() => setVerifying(true)}>Verify &amp; unlock vault</Button>
            </div>
          ) : (
            <p className={cn('rounded-full px-3 py-1 text-sm font-medium', r.status === 'verified' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger')}>
              {r.status === 'verified' ? `Verified ${formatDate(r.reviewed_at)}` : `Rejected: ${r.rejection_reason}`}
            </p>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <Card as="section" aria-labelledby="certificate-heading" className="flex min-w-0 flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <h2 id="certificate-heading" className="text-lg font-semibold text-ink">
                Death certificate
              </h2>
              {r.certificate && (
                <a href={r.certificate.url} target="_blank" rel="noreferrer" className="text-sm font-semibold text-primary hover:underline">
                  Open in a new tab<span className="sr-only"> (opens in a new tab)</span>
                </a>
              )}
            </div>
            {!r.certificate && <p className="text-muted">The certificate file could not be loaded. Ask the family to report again.</p>}
            {r.certificate?.kind === 'pdf' && (
              <iframe title="Death certificate" src={r.certificate.url} className="h-[32rem] w-full rounded-control border border-border bg-cream" />
            )}
            {r.certificate?.kind === 'image' && (
              <img src={r.certificate.url} alt={`Death certificate for ${r.owner.full_name}`} className="w-full rounded-control border border-border object-contain" />
            )}
            <p className="text-xs text-muted">This link works for 60 seconds. Reload the page if it stops showing.</p>
          </Card>

          <div className="flex min-w-0 flex-col gap-6">
            <Card as="section" aria-label="Report details">
              <dl className="grid gap-3 text-sm">
                <Detail label="Deceased" value={r.owner.full_name} />
                {r.owner.phone && <Detail label="Phone on file" value={r.owner.phone} />}
                <Detail label="Date of death" value={formatDate(r.date_of_death)} />
                <Detail label="Reported by" value={reporter} />
                <Detail label="DHA reference / BI-1663" value={r.dha_reference || 'Not given'} />
                <Detail label="Notes from the family" value={r.notes || 'None'} />
              </dl>
            </Card>

            <Card as="section" aria-labelledby="policies-heading">
              <h2 id="policies-heading" className="text-lg font-semibold text-ink">
                Policies
              </h2>
              <p className="mb-3 text-sm text-muted">Verifying opens a claim for each policy that can pay out.</p>
              <ul className="flex flex-col gap-2">
                {r.policies.map((/** @type {any} */ p) => (
                  <li key={p.id} aria-label={`${p.insurer} ${p.policy_number}`} className="flex items-center justify-between gap-2 rounded-control bg-cream px-3 py-2 text-sm">
                    <span>
                      <span className="font-medium text-ink">{p.insurer}</span> · {formatZAR(p.cover_amount)}
                    </span>
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', p.will_claim ? 'bg-success/10 text-success' : 'bg-muted/10 text-muted')}>
                      {p.will_claim ? 'Becomes a claim' : 'Lapsed: no claim'}
                    </span>
                  </li>
                ))}
                {r.policies.length === 0 && <li className="text-sm text-muted">No policies recorded.</li>}
              </ul>
            </Card>
          </div>
        </div>
      </div>

      <ConfirmVerify open={verifying} onClose={() => setVerifying(false)} report={r} reporterName={r.reporter.full_name} claimCount={claimCount} />
      <RejectDialog open={rejecting} onClose={() => setRejecting(false)} report={r} />
    </BrokerShell>
  )
}

/** @param {{ label: string, value: string }} props */
function Detail({ label, value }) {
  return (
    <div>
      <dt className="text-muted">{label}</dt>
      <dd className="font-medium break-words text-ink">{value}</dd>
    </div>
  )
}

/** @param {{ open: boolean, onClose: () => void, report: any, reporterName: string, claimCount: number }} props */
function ConfirmVerify({ open, onClose, report, reporterName, claimCount }) {
  const verify = useVerifyReport()
  const toast = useToast()
  const navigate = useNavigate()
  const [error, setError] = useState('')

  async function handleVerify() {
    try {
      const result = await verify.mutateAsync(report.id)
      const n = result.claims_created
      toast(`Verified. ${n} claim${n === 1 ? '' : 's'} created`, 'success')
      navigate('/broker')
    } catch (err) {
      setError(/** @type {Error} */ (err).message)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Verify this death?"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Not yet
          </Button>
          <Button loading={verify.isPending} onClick={handleVerify}>
            Yes, verify
          </Button>
        </>
      }
    >
      {error && <p role="alert" className="mb-3 text-sm text-danger">{error}</p>}
      <p>
        This will give {reporterName} access to {report.owner.full_name}&rsquo;s vault and create {claimCount} claim
        {claimCount === 1 ? '' : 's'}. Only verify if the certificate is genuine and matches.
      </p>
    </Modal>
  )
}

/** @param {{ open: boolean, onClose: () => void, report: any }} props */
function RejectDialog({ open, onClose, report }) {
  const id = useId()
  const reject = useRejectReport()
  const toast = useToast()
  const navigate = useNavigate()
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')

  async function handleReject() {
    if (!reason.trim()) {
      setError('Tell the family why, so they know what to fix.')
      return
    }
    try {
      await reject.mutateAsync({ id: report.id, reason: reason.trim() })
      toast('Report rejected. The family can see your reason and report again.', 'success')
      navigate('/broker')
    } catch (err) {
      setError(/** @type {Error} */ (err).message)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Reject this report?"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" loading={reject.isPending} onClick={handleReject}>
            Reject report
          </Button>
        </>
      }
    >
      <Field id={`${id}-reason`} label="Reason (shared with the family)" error={error}>
        {(aria) => (
          <textarea
            {...aria}
            rows={3}
            maxLength={500}
            placeholder="E.g. the certificate is not readable, or the name doesn't match."
            value={reason}
            onChange={(e) => {
              setReason(e.target.value)
              setError('')
            }}
            className={cn(controlClass, error ? 'border-danger' : 'border-border', 'py-2')}
          />
        )}
      </Field>
    </Modal>
  )
}
