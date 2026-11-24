import { useCallback, useEffect, useMemo, useState } from 'react'
import { AuthContext } from './AuthContext.js'
import { friendlyAuthError } from './authErrors.js'

/** @typedef {import('./AuthContext.js').AuthValue} AuthValue */
/** @typedef {import('./AuthContext.js').Profile} Profile */

/**
 * The subset of the Supabase client used here. Passed in as a prop so tests
 * can supply an in-memory fake instead of the real network client.
 * @typedef {{
 *   auth: {
 *     onAuthStateChange: (cb: (event: string, session: any) => void) => { data: { subscription: { unsubscribe: () => void } } },
 *     signInWithPassword: (credentials: { email: string, password: string }) => Promise<{ error: any }>,
 *     signUp: (input: { email: string, password: string, options?: { data?: Record<string, string> } }) => Promise<{ data: { session: any }, error: any }>,
 *     signOut: () => Promise<{ error: any }>,
 *     getSession: () => Promise<{ data: { session: any } }>,
 *   },
 *   from: (table: string) => any,
 * }} AuthClient
 */

const PROFILE_COLUMNS = 'id, email, full_name, phone, role'

/**
 * Keeps track of the logged-in user and their profile (incl. role) for the
 * whole app. The role is read from the database, where RLS only lets each
 * user read their own row and only admins can change roles.
 * @param {{ client: AuthClient, children: React.ReactNode }} props
 */
export function AuthProvider({ client, children }) {
  const [state, setState] = useState(
    /** @type {{ status: AuthValue['status'], profile: Profile | null }} */ ({ status: 'loading', profile: null }),
  )
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    let latest = 0

    /** @param {any} session */
    async function load(session) {
      const run = ++latest
      if (!session) {
        setState({ status: 'signedOut', profile: null })
        return
      }
      const { data, error } = await client.from('profiles').select(PROFILE_COLUMNS).eq('id', session.user.id).single()
      if (!active || run !== latest) return // a newer login/logout has happened since
      setState(error || !data ? { status: 'error', profile: null } : { status: 'signedIn', profile: data })
    }

    const { data } = client.auth.onAuthStateChange((event, session) => {
      if (event === 'TOKEN_REFRESHED') return // same person, new token: profile unchanged
      // Supabase advises against awaiting other Supabase calls inside this
      // callback (it can deadlock), so load the profile on the next tick.
      setTimeout(() => {
        if (active) load(session)
      }, 0)
    })
    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [client, attempt])

  const signIn = useCallback(
    /** @type {AuthValue['signIn']} */
    async (email, password) => {
      const { error } = await client.auth.signInWithPassword({ email, password })
      return { error: error ? friendlyAuthError(error) : null }
    },
    [client],
  )

  const signUp = useCallback(
    /** @type {AuthValue['signUp']} */
    async ({ fullName, email, phone, password }) => {
      // Only name and phone go in metadata. The role is never sent: the
      // database makes every new account a 'member'.
      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName, phone } },
      })
      if (error) return { error: friendlyAuthError(error) }
      return { error: null, needsConfirmation: !data.session }
    },
    [client],
  )

  const signOut = useCallback(async () => {
    await client.auth.signOut()
  }, [client])

  // The current access token for API calls. getSession() returns a fresh
  // token (Supabase refreshes it automatically before it expires).
  const getToken = useCallback(async () => {
    const { data } = await client.auth.getSession()
    return data.session?.access_token ?? null
  }, [client])

  const retry = useCallback(() => {
    setState({ status: 'loading', profile: null })
    setAttempt((n) => n + 1)
  }, [])

  const value = useMemo(
    () => ({ ...state, signIn, signUp, signOut, retry, getToken }),
    [state, signIn, signUp, signOut, retry, getToken],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
