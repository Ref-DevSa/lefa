import { SystemPage } from './SystemPage.jsx'
import { alertIcon, lockIcon, searchIcon } from './icons.jsx'
import { useAuth } from '../auth/useAuth.js'
import { homeFor } from '../auth/roles.js'

// Sends people back to *their* home: members to the vault, brokers/admins to
// the dashboard (a broker sent to /vault would just hit 403 again).
export function ForbiddenPage() {
  const { profile } = useAuth()
  const isMember = !profile || profile.role === 'member'
  return (
    <SystemPage
      code="403"
      title="You don't have access to this page"
      message="This page belongs to another role or family. If you think that's wrong, ask your broker or admin."
      actionTo={profile ? homeFor(profile.role) : '/vault'}
      actionLabel={isMember ? 'Go to my vault' : 'Go to my dashboard'}
      icon={lockIcon}
    />
  )
}

export function NotFoundPage() {
  return (
    <SystemPage
      code="404"
      title="Page not found"
      message="The page you're looking for doesn't exist or has moved."
      actionTo="/"
      actionLabel="Back to home"
      icon={searchIcon}
    />
  )
}

export function ErrorPage() {
  return (
    <SystemPage
      title="Something went wrong"
      message="Try again in a moment. Your vault is safe."
      actionTo="/"
      actionLabel="Try again"
      icon={alertIcon}
    />
  )
}
