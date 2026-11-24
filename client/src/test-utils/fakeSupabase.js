/**
 * In-memory stand-in for the parts of the Supabase client that auth uses.
 * Mirrors the real behaviour that matters: sign-up always creates a
 * 'member' (the database trigger ignores any role in metadata), and a user
 * can only read their own profile (RLS).
 */

/** @typedef {{ id: string, email: string, password: string, full_name: string, phone: string | null, role: 'member' | 'broker' | 'admin' }} FakeUser */

/**
 * @param {{ users?: Array<Omit<FakeUser, 'id'> & { id?: string }>, signedInAs?: string, profileError?: boolean }} [options]
 */
export function createFakeSupabase({ users = [], signedInAs, profileError = false } = {}) {
  /** @type {FakeUser[]} */
  const db = users.map((u, i) => ({ id: u.id ?? `user-${i + 1}`, ...u }))
  /** @type {Set<(event: string, session: any) => void>} */
  const listeners = new Set()
  /** @type {any[]} */
  const calls = []

  /** @param {FakeUser} user */
  const sessionFor = (user) => ({ access_token: `token-${user.id}`, user: { id: user.id, email: user.email } })
  const signedIn = db.find((u) => u.email === signedInAs)
  /** @type {any} */
  let session = signedIn ? sessionFor(signedIn) : null

  /** @param {string} event */
  const emit = (event) => listeners.forEach((cb) => cb(event, session))

  const client = {
    calls,
    users: db,
    auth: {
      /** @param {(event: string, session: any) => void} callback */
      onAuthStateChange(callback) {
        listeners.add(callback)
        queueMicrotask(() => callback('INITIAL_SESSION', session))
        return { data: { subscription: { unsubscribe: () => listeners.delete(callback) } } }
      },

      /** @param {{ email: string, password: string }} credentials */
      async signInWithPassword({ email, password }) {
        calls.push(['signInWithPassword', { email }])
        const user = db.find((u) => u.email === email && u.password === password)
        if (!user) {
          return { data: { user: null, session: null }, error: { code: 'invalid_credentials', status: 400, message: 'Invalid login credentials' } }
        }
        session = sessionFor(user)
        emit('SIGNED_IN')
        return { data: { user: session.user, session }, error: null }
      },

      /** @param {{ email: string, password: string, options?: { data?: Record<string, string> } }} input */
      async signUp({ email, password, options }) {
        calls.push(['signUp', { email, data: options?.data }])
        if (db.some((u) => u.email === email)) {
          return { data: { user: null, session: null }, error: { code: 'user_already_exists', status: 422, message: 'User already registered' } }
        }
        const meta = options?.data ?? {}
        /** @type {FakeUser} */
        const user = { id: `user-${db.length + 1}`, email, password, full_name: meta.full_name ?? '', phone: meta.phone ?? null, role: 'member' }
        db.push(user)
        session = sessionFor(user)
        emit('SIGNED_IN')
        return { data: { user: session.user, session }, error: null }
      },

      async getSession() {
        return { data: { session }, error: null }
      },

      async signOut() {
        calls.push(['signOut'])
        session = null
        emit('SIGNED_OUT')
        return { error: null }
      },
    },

    /** @param {string} table */
    from(table) {
      if (table !== 'profiles') throw new Error(`fake supabase: unexpected table ${table}`)
      return {
        select: () => ({
          /** @param {string} _column @param {string} id */
          eq: (_column, id) => ({
            async single() {
              const visible = session && session.user.id === id ? db.find((u) => u.id === id) : undefined
              if (profileError || !visible) {
                return { data: null, error: { code: 'PGRST116', message: 'No rows' } }
              }
              const { id: pid, email, full_name, phone, role } = visible
              return { data: { id: pid, email, full_name, phone, role }, error: null }
            },
          }),
        }),
      }
    },
  }
  return client
}
