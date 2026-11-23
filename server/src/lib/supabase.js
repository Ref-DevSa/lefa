import { createClient } from '@supabase/supabase-js'

/**
 * @typedef {{ forUser: (token: string) => any }} SupabaseFactory
 */

/**
 * Creates Supabase clients that act *as the calling user*: every database
 * request carries their login token, so Row Level Security decides what they
 * can see, exactly as if they had asked the database directly.
 *
 * Only the public anon key is used here. The service_role (master) key is
 * never used for requests made on behalf of users (PRD §6).
 *
 * @param {{ url: string, anonKey: string }} config
 * @returns {SupabaseFactory}
 */
export function createSupabaseFactory({ url, anonKey }) {
  return {
    forUser(token) {
      return createClient(url, anonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      })
    },
  }
}
