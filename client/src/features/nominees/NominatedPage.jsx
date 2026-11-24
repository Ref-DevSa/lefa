import { Link } from 'react-router'
import { Button } from '../../components/ui/Button.jsx'
import { Card } from '../../components/ui/Card.jsx'
import { EmptyState } from '../../components/ui/EmptyState.jsx'
import { useToast } from '../../components/ui/useToast.js'
import { MemberShell } from '../vault/MemberShell.jsx'
import { LockNote } from './LockNote.jsx'
import { relationshipLabel } from './nomineeFormat.js'
import { useNominations, useUpdateNominee } from './queries.js'

/**
 * Nominated for me (S8): invitations to accept or decline, and the people
 * who trust you. Before a death is verified you see only their name.
 */
export default function NominatedPage() {
  const nominations = useNominations()
  const list = nominations.data ?? []
  const invitations = list.filter((n) => n.status === 'invited')
  const trusted = list.filter((n) => n.status === 'accepted')

  return (
    <MemberShell>
      <div className="flex flex-col gap-6">
        <Card>
          <h1 className="text-2xl font-bold text-ink sm:text-3xl">Nominated for me</h1>
          <p className="mt-1 text-muted">People who trust you to claim for their family.</p>
        </Card>

        {nominations.isPending && <div aria-label="Loading" className="h-32 animate-pulse rounded-card bg-border/50" />}
        {nominations.isError && (
          <Card className="flex flex-col items-center gap-3 py-8 text-center">
            <p>We couldn&apos;t load your nominations.</p>
            <Button onClick={() => nominations.refetch()}>Try again</Button>
          </Card>
        )}
        {nominations.isSuccess && list.length === 0 && (
          <EmptyState
            title="No one has nominated you yet"
            description="When a family member nominates you on Lefa with this email address, their invitation will appear here."
          />
        )}

        {invitations.length > 0 && (
          <section aria-labelledby="invitations-heading" className="flex flex-col gap-3">
            <h2 id="invitations-heading" className="text-lg font-semibold text-ink">
              Invitations
            </h2>
            {invitations.map((n) => (
              <Invitation key={n.id} nomination={n} />
            ))}
          </section>
        )}

        {trusted.length > 0 && (
          <section aria-labelledby="trusted-heading" className="flex flex-col gap-3">
            <h2 id="trusted-heading" className="text-lg font-semibold text-ink">
              People who trust you
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              {trusted.map((n) => (
                <Card as="article" key={n.id} aria-label={n.owner_name} className="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <span aria-hidden="true" className="grid size-11 place-items-center rounded-full bg-primary/10 font-bold text-primary">
                      {n.owner_name.split(' ').map((w) => w[0]).slice(0, 2).join('')}
                    </span>
                    <div>
                      <h3 className="font-semibold text-ink">{n.owner_name}</h3>
                      <p className="text-sm text-muted">
                        You are their nominee{n.relationship !== 'other' && ` (${relationshipLabel(n.relationship).toLowerCase()})`}
                      </p>
                    </div>
                  </div>
                  <VaultState nomination={n} />
                </Card>
              ))}
            </div>
          </section>
        )}
      </div>
    </MemberShell>
  )
}

/** @param {{ nomination: Record<string, any> }} props */
function Invitation({ nomination }) {
  const update = useUpdateNominee()
  const toast = useToast()

  /** @param {'accept' | 'decline'} action */
  async function respond(action) {
    try {
      await update.mutateAsync({ id: nomination.id, action })
      toast(action === 'accept' ? `You are now ${nomination.owner_name}’s nominee` : 'Invitation declined', 'success')
    } catch (err) {
      toast(/** @type {Error} */ (err).message, 'error')
    }
  }

  return (
    <Card as="article" aria-label={`Invitation from ${nomination.owner_name}`} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-ink">
          <strong>{nomination.owner_name}</strong> has nominated you as their trusted person
          {nomination.relationship !== 'other' && ` (${relationshipLabel(nomination.relationship).toLowerCase()})`}.
        </p>
        <p className="mt-1 text-sm text-muted">
          If something happens to them, you&apos;ll be the one who can see their cover and claim for the family. Until then you
          see nothing.
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button variant="secondary" disabled={update.isPending} onClick={() => respond('decline')}>
          Decline
        </Button>
        <Button loading={update.isPending} onClick={() => respond('accept')}>
          Accept
        </Button>
      </div>
    </Card>
  )
}

const linkButton =
  'inline-flex min-h-11 items-center justify-center self-start rounded-control px-4 font-semibold transition-colors'

/**
 * Where this person's vault stands: locked (report a death), under review,
 * rejected (with the broker's reason) or unlocked (open it).
 * @param {{ nomination: Record<string, any> }} props
 */
function VaultState({ nomination }) {
  const state = nomination.vault?.state ?? 'locked'
  const firstName = nomination.owner_name.split(' ')[0]

  if (state === 'unlocked') {
    return (
      <div className="flex flex-col gap-3 rounded-card border border-success/30 bg-success/5 p-4">
        <p className="font-semibold text-success">Vault unlocked</p>
        <p className="text-sm text-ink">
          The death was verified. You can now see {firstName}&apos;s policies and documents and track every claim.
        </p>
        <Link to={`/vaults/${nomination.owner_id}`} className={`${linkButton} bg-primary text-on-primary hover:bg-primary-hover`}>
          Open vault
        </Link>
      </div>
    )
  }
  if (state === 'under_review') {
    return (
      <div className="rounded-card border border-info/30 bg-info/5 p-4">
        <p className="font-semibold text-info">Death report pending verification</p>
        <p className="mt-1 text-sm text-ink">A broker is checking the certificate, usually within 24 hours. We&apos;ll unlock the vault as soon as it&apos;s verified.</p>
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-3">
      {state === 'rejected' && (
        <div className="rounded-card border border-danger/30 bg-danger/5 p-4 text-sm">
          <p className="font-semibold text-danger">The report was not accepted</p>
          <p className="mt-1 text-ink">Reason: {nomination.vault.rejection_reason}</p>
        </div>
      )}
      <LockNote>
        <strong>Vault locked</strong>
        <br />
        You&apos;ll see their policies and documents only after a death is verified by a broker.
      </LockNote>
      <Link
        to={`/nominated/${nomination.owner_id}/report`}
        className={`${linkButton} border border-primary bg-surface text-primary hover:bg-cream`}
      >
        {state === 'rejected' ? 'Report again' : 'Report a death'}
      </Link>
    </div>
  )
}
