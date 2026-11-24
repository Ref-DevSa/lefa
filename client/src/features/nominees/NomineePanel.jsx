import { Link } from 'react-router'
import { Card } from '../../components/ui/Card.jsx'
import { LockNote } from './LockNote.jsx'
import { STATUS_LABELS, relationshipLabel } from './nomineeFormat.js'
import { useNominees } from './queries.js'

/** "Your nominees" on My Vault (S3): who can claim, and the privacy promise. */
export function NomineePanel() {
  const nominees = useNominees()
  const active = (nominees.data ?? []).filter((n) => n.status === 'invited' || n.status === 'accepted')

  return (
    <Card as="section" aria-labelledby="nominee-panel-heading" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 id="nominee-panel-heading" className="text-lg font-semibold text-ink">
          Your nominees
        </h2>
        {active.length > 0 && (
          <Link to="/nominees" className="text-sm font-semibold text-primary hover:underline">
            Manage
          </Link>
        )}
      </div>
      {nominees.isSuccess && active.length === 0 && (
        <>
          <p className="text-muted">Nobody can claim for your family yet. Choose someone you trust.</p>
          <Link
            to="/nominees"
            className="inline-flex min-h-11 items-center justify-center self-start rounded-control bg-primary px-4 font-semibold text-on-primary hover:bg-primary-hover"
          >
            Nominate someone you trust
          </Link>
        </>
      )}
      {active.length > 0 && (
        <>
          <ul className="flex flex-col gap-2">
            {active.map((n) => (
              <li key={n.id} className="flex items-center gap-3">
                <span aria-hidden="true" className="grid size-9 place-items-center rounded-full bg-accent/15 font-bold text-ink uppercase">
                  {n.nominee_email[0]}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-medium text-ink">{n.nominee_email}</span>
                  <span className="text-sm text-muted">
                    {relationshipLabel(n.relationship)} · {STATUS_LABELS[/** @type {keyof typeof STATUS_LABELS} */ (n.status)]}
                  </span>
                </span>
              </li>
            ))}
          </ul>
          <LockNote>They can&apos;t see your vault until a death is verified.</LockNote>
        </>
      )}
    </Card>
  )
}
