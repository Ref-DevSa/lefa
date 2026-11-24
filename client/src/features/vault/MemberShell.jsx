import { AppShell } from '../../components/layout/AppShell.jsx'
import { LogoutButton } from '../auth/LogoutButton.jsx'

const memberNav = [
  { to: '/vault', label: 'My Vault' },
  { to: '/documents', label: 'Documents' },
  { to: '/nominees', label: 'Nominees' },
  { to: '/nominated', label: 'Nominated for me', shortLabel: 'For me' },
]

/** Page frame for signed-in members. @param {{ children: React.ReactNode }} props */
export function MemberShell({ children }) {
  return (
    <AppShell navItems={memberNav} actions={<LogoutButton />}>
      {children}
    </AppShell>
  )
}
