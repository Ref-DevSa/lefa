import { AppShell } from '../../components/layout/AppShell.jsx'
import { LogoutButton } from '../auth/LogoutButton.jsx'

// Nominees and "Nominated for me" join this menu in #12.
const memberNav = [
  { to: '/vault', label: 'My Vault' },
  { to: '/documents', label: 'Documents' },
]

/** Page frame for signed-in members. @param {{ children: React.ReactNode }} props */
export function MemberShell({ children }) {
  return (
    <AppShell navItems={memberNav} actions={<LogoutButton />}>
      {children}
    </AppShell>
  )
}
