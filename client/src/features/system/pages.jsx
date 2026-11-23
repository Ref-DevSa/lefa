import { SystemPage } from './SystemPage.jsx'
import { alertIcon, lockIcon, searchIcon } from './icons.jsx'

// "Go to my vault" points at /vault, which lands with auth (#7) and the vault (#10).
export function ForbiddenPage() {
  return (
    <SystemPage
      code="403"
      title="You don't have access to this page"
      message="This page belongs to another role or family. If you think that's wrong, ask your broker or admin."
      actionTo="/vault"
      actionLabel="Go to my vault"
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
