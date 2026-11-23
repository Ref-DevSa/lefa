import { Navigate, Outlet, useLocation } from 'react-router'
import { Button } from '../../components/ui/Button.jsx'
import { Logo } from '../../components/layout/Logo.jsx'
import { PageLoader } from '../../components/layout/PageLoader.jsx'
import { ForbiddenPage } from '../system/pages.jsx'
import { useAuth } from './useAuth.js'

/**
 * Wraps signed-in pages. Logged-out visitors go to /login, remembering where
 * they were heading so they land there after logging in.
 *
 * This is about user experience, not security: the real protection is RLS in
 * the database, which refuses data to anyone without a valid login.
 */
export function RequireAuth() {
  const { status, retry } = useAuth()
  const location = useLocation()

  if (status === 'loading') return <PageLoader label="Opening your vault…" />
  if (status === 'signedOut') {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  }
  if (status === 'error') {
    return (
      <div className="flex min-h-screen flex-col bg-cream">
        <header className="mx-auto w-full max-w-6xl px-4 py-4">
          <Logo />
        </header>
        <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 pb-16 text-center">
          <h1 className="text-2xl font-bold text-ink">We couldn&apos;t load your account</h1>
          <p className="text-muted">Check your connection and try again. Your vault is safe.</p>
          <Button onClick={retry}>Try again</Button>
        </main>
      </div>
    )
  }
  return <Outlet />
}

/**
 * Only lets the listed roles through; everyone else sees the 403 page
 * (PRD M1: "wrong-role users see a 403 screen").
 * @param {{ roles: Array<import('./roles.js').Role> }} props
 */
export function RequireRole({ roles }) {
  const { profile } = useAuth()
  if (!profile || !roles.includes(profile.role)) return <ForbiddenPage />
  return <Outlet />
}
