import { AppShell } from '../../components/layout/AppShell.jsx'
import { EmptyState } from '../../components/ui/EmptyState.jsx'
import { LogoutButton } from '../auth/LogoutButton.jsx'
import { useAuth } from '../auth/useAuth.js'

const memberNav = [{ to: '/vault', label: 'My Vault' }]

/** Member home (S3). Placeholder until the policy vault lands in #10. */
export default function VaultPage() {
  const { profile } = useAuth()
  const firstName = profile?.full_name.split(' ')[0] || 'there'
  return (
    <AppShell navItems={memberNav} actions={<LogoutButton />}>
      <h1 className="text-2xl font-bold text-ink sm:text-3xl">Dumela, {firstName}</h1>
      <p className="mt-1 text-muted">This is your family vault.</p>
      <div className="mt-8">
        <EmptyState
          title="Your vault is ready"
          description="Soon you'll add every policy here and see your total cover in one place."
        />
      </div>
    </AppShell>
  )
}
