import { HttpError } from '../lib/httpError.js'

/** @typedef {import('../lib/supabase.js').SupabaseFactory} SupabaseFactory */
/** @typedef {'member' | 'broker' | 'admin'} Role */

const PROFILE_COLUMNS = 'id, email, full_name, phone, role'

/**
 * Checks the caller's Supabase login token ("Authorization: Bearer <token>").
 * On success it sets:
 *   res.locals.user      { id, email }
 *   res.locals.supabase  a client acting as this user (RLS applies)
 *
 * The token is checked with Supabase Auth itself (getUser) rather than only
 * decoding it locally, so a session that was logged out is refused at once.
 *
 * @param {SupabaseFactory | undefined} supabase
 * @returns {import('express').RequestHandler}
 */
export function requireAuth(supabase) {
  return async (req, res, next) => {
    if (!supabase) throw new HttpError(503, 'auth_unavailable', 'Sign-in is temporarily unavailable. Try again shortly.')

    const match = (req.get('authorization') ?? '').match(/^Bearer\s+(\S+)$/i)
    if (!match) throw new HttpError(401, 'unauthorized', 'Log in to continue.')
    const token = match[1]

    const client = supabase.forUser(token)
    const { data, error } = await client.auth.getUser(token)
    if (error && (error.status === 0 || error.status >= 500 || error.name === 'AuthRetryableFetchError')) {
      // Supabase is down or unreachable: that's our problem, not a bad login.
      throw new HttpError(503, 'auth_unavailable', 'Sign-in is temporarily unavailable. Try again shortly.')
    }
    if (error || !data?.user) throw new HttpError(401, 'unauthorized', 'Your session has expired. Log in again.')

    res.locals.user = { id: data.user.id, email: data.user.email }
    res.locals.supabase = client
    next()
  }
}

/**
 * The caller's profile row (incl. role), loaded once per request.
 * @param {import('express').Response} res
 * @returns {Promise<{ id: string, email: string, full_name: string, phone: string | null, role: Role }>}
 */
export async function loadProfile(res) {
  if (res.locals.profile) return res.locals.profile
  const { data, error } = await res.locals.supabase
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq('id', res.locals.user.id)
    .maybeSingle()
  if (error) throw new Error(`profile lookup failed: ${error.message}`)
  if (!data) throw new HttpError(404, 'profile_not_found', "We couldn't find your profile. Contact support.")
  res.locals.profile = data
  return data
}

/**
 * Only lets the listed roles through (use after requireAuth). The role comes
 * from the database, never from anything the browser sends.
 * @param {...Role} roles
 * @returns {import('express').RequestHandler}
 */
export function requireRole(...roles) {
  return async (_req, res, next) => {
    const profile = await loadProfile(res)
    if (!roles.includes(profile.role)) throw new HttpError(403, 'forbidden', "You don't have access to this.")
    next()
  }
}
