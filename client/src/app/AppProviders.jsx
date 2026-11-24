import { useMemo } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { ToastProvider } from '../components/ui/Toast.jsx'
import { AuthProvider } from '../features/auth/AuthProvider.jsx'
import { useAuth } from '../features/auth/useAuth.js'
import { createApi } from '../lib/api.js'
import { API_URL } from '../lib/env.js'
import { ApiContext } from './ApiContext.js'

/** Builds the real API client from the logged-in session. */
function LiveApi({ children }) {
  const { getToken, signOut } = useAuth()
  const api = useMemo(
    () =>
      createApi({
        baseUrl: API_URL,
        getToken,
        // The API said our login is no longer valid: log out cleanly so the
        // guards send the user to the log-in page.
        onUnauthorized: () => {
          signOut()
        },
      }),
    [getToken, signOut],
  )
  return <ApiContext.Provider value={api}>{children}</ApiContext.Provider>
}

/**
 * Everything the app needs around its pages, in one place so App.jsx and the
 * tests wire things up identically. Tests pass fakes for `supabase` and `api`.
 * @param {{
 *   supabase: import('../features/auth/AuthProvider.jsx').AuthClient,
 *   queryClient: import('@tanstack/react-query').QueryClient,
 *   api?: import('../lib/api.js').Api,
 *   children: React.ReactNode,
 * }} props
 */
export function AppProviders({ supabase, queryClient, api, children }) {
  return (
    <AuthProvider client={supabase}>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          {api ? <ApiContext.Provider value={api}>{children}</ApiContext.Provider> : <LiveApi>{children}</LiveApi>}
        </ToastProvider>
      </QueryClientProvider>
    </AuthProvider>
  )
}

