import { useId, useState } from 'react'
import { Link, useParams } from 'react-router'
import { Button } from '../../components/ui/Button.jsx'
import { Card } from '../../components/ui/Card.jsx'
import { Field } from '../../components/ui/Field.jsx'
import { Input } from '../../components/ui/Input.jsx'
import { controlClass } from '../../components/ui/controlClass.js'
import { cn } from '../../lib/cn.js'
import { FormAlert } from '../auth/FormAlert.jsx'
import { ACCEPTED_TYPES, formatBytes, validateFile } from '../documents/docFormat.js'
import { useNominations } from '../nominees/queries.js'
import { MemberShell } from '../vault/MemberShell.jsx'
import { useReportDeath } from './queries.js'

const todayIso = () => new Date().toISOString().slice(0, 10)

function BackLink() {
  return (
    <Link to="/nominated" className="inline-flex min-h-11 items-center gap-1 font-medium text-primary hover:underline">
      <span aria-hidden="true">←</span> Nominated for me
    </Link>
  )
}

/** Report a death (S9): gentle words, few fields, then "under review". */
export default function ReportDeathPage() {
  const { ownerId = '' } = useParams()
  const nominations = useNominations()
  const nomination = nominations.data?.find((n) => n.owner_id === ownerId && n.status === 'accepted')
  const [submitted, setSubmitted] = useState(false)

  let body
  if (nominations.isPending) {
    body = <div aria-label="Loading" className="mt-4 h-64 animate-pulse rounded-card bg-border/50" />
  } else if (!nomination) {
    body = (
      <Card className="mt-4 text-center">
        <h1 className="text-xl font-semibold text-ink">You can&apos;t report this death</h1>
        <p className="mt-2 text-muted">Only someone who was nominated, and accepted, can report a death for that person.</p>
      </Card>
    )
  } else if (submitted || nomination.vault?.state === 'under_review') {
    body = (
      <Card className="mt-4 flex flex-col items-center gap-3 py-10 text-center">
        <span aria-hidden="true" className="grid size-14 place-items-center rounded-full bg-info/10 text-2xl text-info">
          ✓
        </span>
        <h1 className="text-2xl font-bold text-ink">Report submitted</h1>
        <p className="max-w-md text-muted">
          A broker will check the certificate, usually within 24 hours. Once it&apos;s verified you&apos;ll see every policy{' '}
          {nomination.owner_name.split(' ')[0]} had, and a checklist to claim each one.
        </p>
        <Link to="/nominated" className="font-semibold text-primary hover:underline">
          Back to Nominated for me
        </Link>
      </Card>
    )
  } else {
    body = <ReportForm ownerId={ownerId} ownerName={nomination.owner_name} onDone={() => setSubmitted(true)} />
  }

  return (
    <MemberShell>
      <BackLink />
      {body}
    </MemberShell>
  )
}

/** @param {{ ownerId: string, ownerName: string, onDone: () => void }} props */
function ReportForm({ ownerId, ownerName, onDone }) {
  const id = useId()
  const report = useReportDeath()
  const [form, setForm] = useState({ dateOfDeath: '', dhaReference: '', notes: '' })
  const [certificate, setCertificate] = useState(/** @type {File | null} */ (null))
  const [errors, setErrors] = useState(/** @type {Record<string, string>} */ ({}))
  const [formError, setFormError] = useState('')
  const firstName = ownerName.split(' ')[0]

  /** @param {React.FormEvent<HTMLFormElement>} e */
  async function handleSubmit(e) {
    e.preventDefault()
    setFormError('')
    /** @type {Record<string, string>} */
    const found = {}
    if (!form.dateOfDeath) found.dateOfDeath = 'Enter the date of death.'
    else if (form.dateOfDeath > todayIso()) found.dateOfDeath = 'The date of death cannot be in the future.'
    if (!certificate) found.certificate = 'Attach the death certificate (a photo or scan is fine).'
    else {
      const problem = validateFile(certificate)
      if (problem) found.certificate = problem
    }
    setErrors(found)
    if (Object.keys(found).length || !certificate) return
    try {
      await report.mutateAsync({ ownerId, dateOfDeath: form.dateOfDeath, dhaReference: form.dhaReference.trim(), notes: form.notes.trim(), certificate })
      onDone()
    } catch (err) {
      const apiError = /** @type {import('../../lib/api.js').ApiError} */ (err)
      if (apiError.fields && Object.keys(apiError.fields).length) {
        setErrors({ dateOfDeath: apiError.fields.date_of_death, certificate: apiError.fields.certificate })
      } else setFormError(apiError.message)
    }
  }

  return (
    <Card className="mx-auto mt-4 max-w-2xl">
      <h1 className="text-2xl font-bold text-ink">We&rsquo;re sorry for your loss.</h1>
      <p className="mt-2 text-muted">
        We&apos;ll help you claim everything {firstName} was covered for. This takes a few minutes, and you can ask a family
        member to help.
      </p>

      <form noValidate onSubmit={handleSubmit} aria-label={`Report the death of ${ownerName}`} className="mt-6 flex flex-col gap-5">
        {formError && <FormAlert>{formError}</FormAlert>}
        <Input
          id={`${id}-date`}
          type="date"
          label="Date of death"
          max={todayIso()}
          value={form.dateOfDeath}
          onChange={(e) => setForm({ ...form, dateOfDeath: e.target.value })}
          error={errors.dateOfDeath}
          required
        />

        <Field id={`${id}-certificate`} label="Death certificate" error={errors.certificate} required>
          {(aria) => (
            <div className={cn('flex flex-col items-start gap-2 rounded-card border-2 border-dashed p-4', errors.certificate ? 'border-danger' : 'border-border bg-cream')}>
              {certificate ? (
                <p className="font-medium break-all text-ink">
                  {certificate.name} <span className="font-normal text-muted">· {formatBytes(certificate.size)}</span>
                </p>
              ) : (
                <p className="text-sm text-muted">A clear photo or scan of the certificate (PDF, JPG or PNG, up to 5 MB).</p>
              )}
              <label htmlFor={`${id}-certificate`} className="cursor-pointer font-semibold text-primary hover:underline">
                {certificate ? 'Choose a different file' : 'Choose the death certificate'}
              </label>
              <input
                {...aria}
                type="file"
                accept={ACCEPTED_TYPES.join(',')}
                className="sr-only"
                onChange={(e) => {
                  setCertificate(e.target.files?.[0] ?? null)
                  setErrors((x) => ({ ...x, certificate: '' }))
                }}
              />
            </div>
          )}
        </Field>

        <Input
          id={`${id}-dha`}
          label="DHA reference / BI-1663 number (optional)"
          helper="On the notice of death from the doctor or Home Affairs. It helps the broker verify faster."
          value={form.dhaReference}
          onChange={(e) => setForm({ ...form, dhaReference: e.target.value })}
        />
        <Field id={`${id}-notes`} label="Notes for the broker (optional)">
          {(aria) => (
            <textarea
              {...aria}
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className={cn(controlClass, 'border-border py-2')}
            />
          )}
        </Field>

        <p className="rounded-control bg-info/5 px-4 py-3 text-sm text-info">
          A broker will verify the certificate, usually within 24 hours. You&apos;ll then see every policy and a claim checklist.
        </p>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Link to="/nominated" className="inline-flex min-h-11 items-center justify-center rounded-control border border-primary px-4 font-semibold text-primary hover:bg-cream">
            Cancel
          </Link>
          <Button type="submit" loading={report.isPending}>
            Submit report
          </Button>
        </div>
      </form>
    </Card>
  )
}
