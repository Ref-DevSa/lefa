import { useState } from 'react'
import { Button } from '../../components/ui/Button.jsx'
import { Card } from '../../components/ui/Card.jsx'
import { EmptyState } from '../../components/ui/EmptyState.jsx'
import { Input } from '../../components/ui/Input.jsx'
import { Modal } from '../../components/ui/Modal.jsx'
import { Select } from '../../components/ui/Select.jsx'
import { useToast } from '../../components/ui/useToast.js'
import { cn } from '../../lib/cn.js'
import { FormAlert } from '../auth/FormAlert.jsx'
import { useAuth } from '../auth/useAuth.js'
import { MemberShell } from '../vault/MemberShell.jsx'
import { LockNote } from './LockNote.jsx'
import { MAX_NOMINEES, RELATIONSHIPS, STATUS_LABELS, relationshipLabel, shareMessage, validateInvite, whatsappLink } from './nomineeFormat.js'
import { useInviteNominee, useNominees, useUpdateNominee } from './queries.js'

const STATUS_STYLES = {
  invited: 'bg-info/10 text-info',
  accepted: 'bg-success/10 text-success',
  declined: 'bg-muted/10 text-muted',
  revoked: 'bg-muted/10 text-muted',
}

/** Nominees (S7): invite people you trust, see their status, revoke. */
export default function NomineesPage() {
  const nominees = useNominees()
  const [revoking, setRevoking] = useState(/** @type {Record<string, any> | null} */ (null))
  const list = nominees.data ?? []
  const active = list.filter((n) => n.status === 'invited' || n.status === 'accepted').length

  return (
    <MemberShell>
      <div className="flex flex-col gap-6">
        <Card>
          <h1 className="text-2xl font-bold text-ink sm:text-3xl">Nominees</h1>
          <p className="mt-1 text-muted">Choose who can claim for your family when the time comes.</p>
          <LockNote className="mt-4">
            <strong>Your nominees see nothing until a death is verified by a broker.</strong> Then they get your policies,
            documents and a claim tracker, so they can claim everything you were covered for.
          </LockNote>
        </Card>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <Card as="section" aria-labelledby="invite-heading" className="self-start">
            <h2 id="invite-heading" className="text-lg font-semibold text-ink">
              Invite a nominee
            </h2>
            <p className="mt-1 mb-4 text-sm text-muted">
              {active} of {MAX_NOMINEES} nominees
            </p>
            <InviteForm disabled={active >= MAX_NOMINEES} />
          </Card>

          <section aria-labelledby="list-heading" className="flex min-w-0 flex-col gap-3">
            <h2 id="list-heading" className="text-lg font-semibold text-ink">
              Your nominees
            </h2>
            {nominees.isPending && <div aria-label="Loading nominees" className="h-32 animate-pulse rounded-card bg-border/50" />}
            {nominees.isError && (
              <Card className="flex flex-col items-center gap-3 py-8 text-center">
                <p>We couldn&apos;t load your nominees.</p>
                <Button onClick={() => nominees.refetch()}>Try again</Button>
              </Card>
            )}
            {nominees.isSuccess && list.length === 0 && (
              <EmptyState
                title="No nominees yet"
                description="Most people choose a spouse or an adult child: someone who will deal with the funeral and the insurers."
              />
            )}
            {list.length > 0 && (
              <ul className="flex flex-col gap-2">
                {list.map((n) => (
                  <NomineeRow key={n.id} nominee={n} onRevoke={() => setRevoking(n)} />
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
      <ConfirmRevoke nominee={revoking} onClose={() => setRevoking(null)} />
    </MemberShell>
  )
}

/** @param {{ disabled: boolean }} props */
function InviteForm({ disabled }) {
  const { profile } = useAuth()
  const invite = useInviteNominee()
  const toast = useToast()
  const [form, setForm] = useState({ email: '', relationship: '' })
  const [errors, setErrors] = useState(/** @type {Record<string, string>} */ ({}))
  const [formError, setFormError] = useState('')

  /** @param {React.FormEvent<HTMLFormElement>} e */
  async function handleSubmit(e) {
    e.preventDefault()
    setFormError('')
    const { errors: found, values } = validateInvite(form, profile?.email ?? '')
    setErrors(found)
    if (Object.keys(found).length) return
    try {
      await invite.mutateAsync(values)
      toast(`Invitation added for ${values.email}`, 'success')
      setForm({ email: '', relationship: '' })
    } catch (err) {
      const apiError = /** @type {import('../../lib/api.js').ApiError} */ (err)
      if (apiError.fields && Object.keys(apiError.fields).length) setErrors(apiError.fields)
      else setFormError(apiError.message)
    }
  }

  return (
    <form aria-label="Invite a nominee" noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
      {formError && <FormAlert>{formError}</FormAlert>}
      {disabled && <p className="text-sm text-muted">You have {MAX_NOMINEES} nominees. Revoke one to invite someone else.</p>}
      <Input
        id="nominee-email"
        type="email"
        label="Their email"
        helper="They'll see your invitation when they sign up or log in with this email."
        autoComplete="off"
        value={form.email}
        onChange={(e) => setForm({ ...form, email: e.target.value })}
        error={errors.email}
        disabled={disabled}
      />
      <Select
        id="nominee-relationship"
        label="Relationship"
        placeholder="Choose…"
        options={RELATIONSHIPS}
        value={form.relationship}
        onChange={(e) => setForm({ ...form, relationship: e.target.value })}
        error={errors.relationship}
        disabled={disabled}
      />
      <Button type="submit" loading={invite.isPending} disabled={disabled}>
        Send invite
      </Button>
    </form>
  )
}

/** @param {{ nominee: Record<string, any>, onRevoke: () => void }} props */
function NomineeRow({ nominee, onRevoke }) {
  const { profile } = useAuth()
  const update = useUpdateNominee()
  const toast = useToast()
  const status = /** @type {keyof typeof STATUS_LABELS} */ (nominee.status)
  const message = shareMessage(profile?.full_name ?? 'Your family member', nominee.nominee_email, window.location.origin)

  async function reinvite() {
    try {
      await update.mutateAsync({ id: nominee.id, action: 'reinvite' })
      toast(`${nominee.nominee_email} invited again`, 'success')
    } catch (err) {
      toast(/** @type {Error} */ (err).message, 'error')
    }
  }

  return (
    <li aria-label={nominee.nominee_email} className="flex flex-wrap items-center gap-3 rounded-card border border-border bg-surface p-4 shadow-soft">
      <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-full bg-accent/15 font-bold text-ink uppercase">
        {nominee.nominee_email[0]}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-ink">{nominee.nominee_email}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-muted">
          <span>{relationshipLabel(nominee.relationship)}</span>
          <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', STATUS_STYLES[status])}>{STATUS_LABELS[status]}</span>
        </p>
      </div>
      <div className="flex flex-wrap gap-1">
        {status === 'invited' && (
          <a
            href={whatsappLink(message)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-9 items-center rounded-control px-3 text-sm font-semibold text-primary hover:bg-primary/5"
          >
            Share on WhatsApp<span className="sr-only"> with {nominee.nominee_email} (opens in a new tab)</span>
          </a>
        )}
        {(status === 'invited' || status === 'accepted') && (
          <Button size="sm" variant="ghost" className="text-danger hover:bg-danger/5" aria-label={`Revoke ${nominee.nominee_email}`} onClick={onRevoke}>
            Revoke
          </Button>
        )}
        {(status === 'declined' || status === 'revoked') && (
          <Button size="sm" variant="ghost" aria-label={`Re-invite ${nominee.nominee_email}`} loading={update.isPending} onClick={reinvite}>
            Re-invite
          </Button>
        )}
      </div>
    </li>
  )
}

/** @param {{ nominee: Record<string, any> | null, onClose: () => void }} props */
function ConfirmRevoke({ nominee, onClose }) {
  const update = useUpdateNominee()
  const toast = useToast()
  async function handleRevoke() {
    if (!nominee) return
    try {
      await update.mutateAsync({ id: nominee.id, action: 'revoke' })
      toast(`${nominee.nominee_email} is no longer your nominee`, 'success')
    } catch (err) {
      toast(/** @type {Error} */ (err).message, 'error')
    }
    onClose()
  }
  return (
    <Modal
      open={!!nominee}
      onClose={onClose}
      title="Revoke this nominee?"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Keep them
          </Button>
          <Button variant="danger" loading={update.isPending} onClick={handleRevoke}>
            Revoke
          </Button>
        </>
      }
    >
      <p>{nominee?.nominee_email} will no longer be able to claim for your family. You can invite them again later.</p>
    </Modal>
  )
}
