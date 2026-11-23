/**
 * In-memory stand-in for the server's Supabase factory. Each known token maps
 * to a user; profiles are only visible to their owner (like RLS).
 *
 * @param {{
 *   users?: Array<{ token: string, id: string, email: string, full_name?: string, phone?: string | null, role?: 'member' | 'broker' | 'admin', hasProfile?: boolean }>,
 *   authDown?: boolean,
 *   dbError?: boolean,
 * }} [options]
 */
export function createFakeSupabase({ users = [], authDown = false, dbError = false } = {}) {
  /** @type {string[]} tokens each user client was created with */
  const clientsCreatedWith = []

  return {
    clientsCreatedWith,
    /** @param {string} token */
    forUser(token) {
      clientsCreatedWith.push(token)
      const user = users.find((u) => u.token === token)
      return {
        auth: {
          /** @param {string} jwt */
          async getUser(jwt) {
            if (authDown) {
              return { data: { user: null }, error: { name: 'AuthRetryableFetchError', status: 0, message: 'fetch failed' } }
            }
            const match = users.find((u) => u.token === jwt)
            if (!match) return { data: { user: null }, error: { name: 'AuthApiError', status: 403, message: 'invalid JWT' } }
            return { data: { user: { id: match.id, email: match.email } }, error: null }
          },
        },
        /** @param {string} table */
        from(table) {
          if (table !== 'profiles') throw new Error(`fake supabase: unexpected table ${table}`)
          return {
            select: () => ({
              /** @param {string} _col @param {string} id */
              eq: (_col, id) => ({
                async maybeSingle() {
                  if (dbError) return { data: null, error: { code: 'XX000', message: 'connection reset (secret detail)' } }
                  const row = user && user.id === id && user.hasProfile !== false ? user : null
                  if (!row) return { data: null, error: null }
                  return {
                    data: { id: row.id, email: row.email, full_name: row.full_name ?? '', phone: row.phone ?? null, role: row.role ?? 'member' },
                    error: null,
                  }
                },
              }),
            }),
          }
        },
      }
    },
  }
}
