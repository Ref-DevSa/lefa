import { AppShell } from '../../components/layout/AppShell.jsx'
import { EmptyState } from '../../components/ui/EmptyState.jsx'
import { LogoutButton } from '../auth/LogoutButton.jsx'
import { useAuth } from '../auth/useAuth.js'

const brokerNav = [{ to: '/broker', label: 'Dashboard' }]

/** Broker/admin home (S11). Placeholder until #15. */
export default function BrokerDashboard() {
  const { profile } = useAuth()
  const firstName = profile?.full_name.split(' ')[0] || 'there'
  return (
    <AppShell navItems={brokerNav} actions={<LogoutButton />}>
      <h1 className="text-2xl font-bold text-ink sm:text-3xl">Good day, {firstName}</h1>
      <p className="mt-1 text-muted">{profile?.role === 'admin' ? 'Lefa admin' : 'Broker'} dashboard</p>
      <div className="mt-8">
        <EmptyState
          title="No pending verifications"
          description="Death reports from your clients' nominees and open claims will appear here."
        />
      </div>
    </AppShell>
  )
}
