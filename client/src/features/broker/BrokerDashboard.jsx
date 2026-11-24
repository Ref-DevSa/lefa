import { Link } from 'react-router'
import { Card } from '../../components/ui/Card.jsx'
import { EmptyState } from '../../components/ui/EmptyState.jsx'
import { StatTile } from '../../components/ui/StatTile.jsx'
import { formatDate, formatZAR } from '../../lib/format.js'
import { useAuth } from '../auth/useAuth.js'
import { relationshipLabel } from '../nominees/nomineeFormat.js'
import { claimLabel } from '../unlock/claimFormat.js'
import { BrokerShell } from './BrokerShell.jsx'
import { useBrokerOverview, usePendingReports } from './queries.js'

/** Broker dashboard (S11): key numbers, deaths to verify, recent claim activity. */
export default function BrokerDashboard() {
  const { profile } = useAuth()
  const overview = useBrokerOverview()
  const reports = usePendingReports()
  const firstName = profile?.full_name.split(' ')[0] || 'there'
  const o = overview.data?.overview

  return (
    <BrokerShell>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold text-ink sm:text-3xl">Good day, {firstName}</h1>
          <p className="mt-1 text-muted">{profile?.role === 'admin' ? 'Lefa admin' : 'Broker'} dashboard</p>
        </div>

        <section aria-label="Key numbers" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile label="Clients" value={o ? o.clients : '…'} hint="families you look after" />
          <StatTile label="Pending verifications" value={o ? o.pending_reports : '…'} hint={!o ? undefined : o.pending_reports ? 'families are waiting' : 'nothing waiting'} />
          <StatTile label="Open claims" value={o ? o.open_claims : '…'} hint="not yet paid or rejected" />
          <StatTile label="Paid this month" value={o ? formatZAR(o.paid_this_month) : '…'} hint="cover paid out to families" />
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <Card as="section" aria-labelledby="pending-heading" className="min-w-0">
            <h2 id="pending-heading" className="mb-1 text-lg font-semibold text-ink">
              Pending death reports
            </h2>
            <p className="mb-4 text-sm text-muted">Check each certificate. Verifying unlocks the vault for the family and opens their claims.</p>
            {reports.isPending && <div aria-label="Loading reports" className="h-24 animate-pulse rounded-card bg-border/50" />}
            {reports.isSuccess && reports.data.length === 0 && (
              <EmptyState title="No pending verifications" description="New death reports from your clients' nominees will appear here." />
            )}
            {reports.isSuccess && reports.data.length > 0 && (
              <div className="overflow-x-auto">
                <table aria-label="Pending death reports" className="w-full text-left text-sm">
                  <thead className="text-muted">
                    <tr>
                      <th scope="col" className="py-2 pr-3 font-medium">Deceased</th>
                      <th scope="col" className="py-2 pr-3 font-medium">Reported by</th>
                      <th scope="col" className="py-2 pr-3 font-medium">Date of death</th>
                      <th scope="col" className="py-2 pr-3 font-medium">Submitted</th>
                      <th scope="col" className="py-2 font-medium">
                        <span className="sr-only">Action</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.data.map((/** @type {any} */ r) => (
                      <tr key={r.id} className="border-t border-border">
                        <td className="py-3 pr-3 font-medium text-ink">{r.owner_name}</td>
                        <td className="py-3 pr-3">
                          {r.reporter_name}
                          {r.relationship ? ` (${relationshipLabel(r.relationship).toLowerCase()})` : ''}
                        </td>
                        <td className="py-3 pr-3">{formatDate(r.date_of_death)}</td>
                        <td className="py-3 pr-3">{formatDate(r.created_at)}</td>
                        <td className="py-3 text-right">
                          <Link
                            to={`/broker/reports/${r.id}`}
                            aria-label={`Review report for ${r.owner_name}`}
                            className="inline-flex min-h-9 items-center rounded-control bg-primary px-3 font-semibold text-on-primary hover:bg-primary-hover"
                          >
                            Review
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card as="section" aria-label="Recent claim activity">
            <h2 className="mb-4 text-lg font-semibold text-ink">Recent claim activity</h2>
            {overview.isSuccess && overview.data.activity.length === 0 && <p className="text-sm text-muted">No claim updates yet.</p>}
            <ol className="flex flex-col gap-3">
              {(overview.data?.activity ?? []).map((/** @type {any} */ e) => (
                <li key={e.id} className="border-l-2 border-primary/30 pl-3 text-sm">
                  <p className="font-medium text-ink">
                    {e.owner_name} · {e.insurer}
                  </p>
                  <p className="text-muted">
                    {e.from_status ? `${claimLabel(e.from_status)} → ${claimLabel(e.to_status)}` : 'Claim opened'} · {formatDate(e.created_at)}
                  </p>
                  {e.note && <p className="text-ink">{e.note}</p>}
                </li>
              ))}
            </ol>
            <Link to="/broker/claims" className="mt-4 inline-block text-sm font-semibold text-primary hover:underline">
              Open the claims pipeline
            </Link>
          </Card>
        </div>
      </div>
    </BrokerShell>
  )
}
