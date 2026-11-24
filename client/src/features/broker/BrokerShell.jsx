import { AppShell } from '../../components/layout/AppShell.jsx'
import { LogoutButton } from '../auth/LogoutButton.jsx'

const brokerNav = [
  { to: '/broker', label: 'Dashboard', end: true },
  { to: '/broker/claims', label: 'Claims' },
]

/** Page frame for brokers and admins. @param {{ children: React.ReactNode }} props */
export function BrokerShell({ children }) {
  return (
    <AppShell navItems={brokerNav} actions={<LogoutButton />}>
      {children}
    </AppShell>
  )
}
