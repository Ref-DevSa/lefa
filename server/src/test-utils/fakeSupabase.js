import { randomUUID } from 'node:crypto'

/**
 * In-memory stand-in for the server's Supabase factory, for API tests.
 *
 * - Each known token maps to a user; `forUser(token)` returns a client acting
 *   as that user.
 * - Tables mimic Row Level Security: a user sees their own rows (profiles by
 *   `id`, everything else by `owner_id`); admins see all.
 * - Supports the small slice of the query builder the API uses:
 *   select / insert / update / delete, eq, order, single, maybeSingle.
 *
 * Real RLS is tested against the database with pgTAP (supabase/tests).
 */

/** @typedef {'member' | 'broker' | 'admin'} Role */
/** @typedef {{ token: string, id: string, email: string, full_name?: string, phone?: string | null, role?: Role, hasProfile?: boolean }} FakeUser */
/** @typedef {Record<string, any>} Row */

const POLICY_DEFAULTS = {
  type: 'funeral',
  cover_amount: 0,
  monthly_premium: 0,
  debit_day: null,
  status: 'active',
  beneficiaries: '',
  notes: '',
}

/**
 * @param {{ users?: FakeUser[], policies?: Row[], documents?: Row[], nominees?: Row[], files?: Record<string, Buffer>,
 *   authDown?: boolean, dbError?: boolean, storageDown?: boolean }} [options]
 */
export function createFakeSupabase({ users = [], policies = [], documents = [], nominees = [], files = {}, authDown = false, dbError = false, storageDown = false } = {}) {
  /** @type {string[]} tokens each user client was created with */
  const clientsCreatedWith = []

  /** @type {Record<string, Row[]>} */
  const tables = {
    profiles: users
      .filter((u) => u.hasProfile !== false)
      .map((u) => ({ id: u.id, email: u.email, full_name: u.full_name ?? '', phone: u.phone ?? null, role: u.role ?? 'member' })),
    policies: policies.map((p) => ({
      id: randomUUID(),
      ...POLICY_DEFAULTS,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...p,
    })),
    documents: documents.map((d) => ({ id: randomUUID(), policy_id: null, created_at: new Date().toISOString(), ...d })),
    nominees: nominees.map((n) => ({
      id: randomUUID(),
      nominee_id: null,
      status: 'invited',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...n,
    })),
  }
  /** Files in the private "vault" bucket, by path. */
  const storage = new Map(Object.entries(files))

  return {
    clientsCreatedWith,
    tables,
    storage,
    /** @param {string} token */
    forUser(token) {
      clientsCreatedWith.push(token)
      const me = users.find((u) => u.token === token)
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
        /** Database functions (supabase.rpc). @param {string} fn */
        async rpc(fn) {
          if (dbError) return { data: null, error: { code: 'XX000', message: 'connection reset (secret detail)' } }
          if (fn !== 'my_nominations') throw new Error(`fake supabase: unexpected rpc ${fn}`)
          if (!me) return { data: [], error: null }
          const rows = tables.nominees
            .filter((n) => (n.nominee_id === me.id || n.nominee_email === me.email) && ['invited', 'accepted'].includes(n.status))
            .map((n) => ({
              id: n.id,
              owner_id: n.owner_id,
              owner_name: tables.profiles.find((p) => p.id === n.owner_id)?.full_name ?? '',
              relationship: n.relationship,
              status: n.status,
              created_at: n.created_at,
            }))
          return { data: rows, error: null }
        },
        /** @param {string} table */
        from(table) {
          if (!tables[table]) throw new Error(`fake supabase: unexpected table ${table}`)
          return new Query(tables[table], table, me, dbError, tables)
        },
        // Storage with the same rule as the real bucket: only your own folder.
        storage: {
          /** @param {string} bucket */
          from(bucket) {
            if (bucket !== 'vault') throw new Error(`fake supabase: unexpected bucket ${bucket}`)
            const mine = (/** @type {string} */ path) => !!me && (me.role === 'admin' || path.startsWith(`${me.id}/`))
            const denied = { statusCode: '403', message: 'new row violates row-level security policy' }
            return {
              /** @param {string} path @param {Buffer} body */
              async upload(path, body) {
                if (storageDown) return { data: null, error: { statusCode: '500', message: 'storage unavailable' } }
                if (!me || !path.startsWith(`${me.id}/`)) return { data: null, error: denied }
                storage.set(path, body)
                return { data: { path }, error: null }
              },
              /** @param {string[]} paths */
              async remove(paths) {
                for (const p of paths) if (mine(p)) storage.delete(p)
                return { data: [], error: null }
              },
              /** @param {string} path @param {number} expiresIn */
              async createSignedUrl(path, expiresIn) {
                if (!mine(path) || !storage.has(path)) return { data: null, error: { statusCode: '404', message: 'Object not found' } }
                return { data: { signedUrl: `https://storage.test/vault/${path}?token=signed&expires=${expiresIn}` }, error: null }
              },
            }
          },
        },
      }
    },
  }
}

class Query {
  /**
   * @param {Row[]} rows @param {string} table
   * @param {FakeUser | undefined} me @param {boolean} dbError
   * @param {Record<string, Row[]>} [allTables]
   */
  constructor(rows, table, me, dbError, allTables = {}) {
    this.allTables = allTables
    this.rows = rows
    this.table = table
    this.me = me
    this.dbError = dbError
    /** @type {'select' | 'insert' | 'update' | 'delete'} */
    this.op = 'select'
    /** @type {Array<[string, any]>} */
    this.filters = []
    /** @type {any} */
    this.payload = null
    /** @type {[string, boolean] | null} */
    this.sort = null
    this.returning = false
  }

  select() {
    this.returning = true
    return this
  }
  /** @param {Row | Row[]} rows */
  insert(rows) {
    this.op = 'insert'
    this.payload = Array.isArray(rows) ? rows : [rows]
    return this
  }
  /** @param {Row} patch */
  update(patch) {
    this.op = 'update'
    this.payload = patch
    return this
  }
  delete() {
    this.op = 'delete'
    return this
  }
  /** @param {string} column @param {any} value */
  eq(column, value) {
    this.filters.push([column, value])
    return this
  }
  /** @param {string} column @param {{ ascending?: boolean }} [opts] */
  order(column, opts = {}) {
    this.sort = [column, opts.ascending !== false]
    return this
  }
  async single() {
    const { data, error } = await this.run()
    if (error) return { data: null, error }
    if (data.length !== 1) return { data: null, error: { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' } }
    return { data: data[0], error: null }
  }
  async maybeSingle() {
    const { data, error } = await this.run()
    if (error) return { data: null, error }
    return { data: data[0] ?? null, error: null }
  }
  /** Makes `await query` work like the real builder. @param {(v: any) => any} resolve @param {(e: any) => any} [reject] */
  then(resolve, reject) {
    return this.run().then(resolve, reject)
  }

  /** @param {Row} row */
  visible(row) {
    if (!this.me) return false
    if (this.me.role === 'admin') return true
    if (this.table === 'profiles') return row.id === this.me.id
    if (this.table === 'nominees') {
      return row.owner_id === this.me.id || row.nominee_id === this.me.id || row.nominee_email === this.me.email
    }
    return row.owner_id === this.me.id
  }

  async run() {
    if (this.dbError) return { data: null, error: { code: 'XX000', message: 'connection reset (secret detail)' } }
    const matches = () => this.rows.filter((r) => this.visible(r) && this.filters.every(([c, v]) => r[c] === v))

    if (this.op === 'insert') {
      const created = []
      for (const input of this.payload) {
        const row = {
          id: randomUUID(),
          owner_id: this.me?.id,
          ...(this.table === 'policies'
            ? POLICY_DEFAULTS
            : this.table === 'nominees'
              ? { nominee_id: null, status: 'invited', updated_at: new Date().toISOString() }
              : { policy_id: null }),
          created_at: new Date().toISOString(),
          ...(this.table === 'policies' ? { updated_at: new Date().toISOString() } : {}),
          ...input,
        }
        const rls = { data: null, error: { code: '42501', message: 'new row violates row-level security policy' } }
        if (row.owner_id !== this.me?.id) return rls
        // documents: may only link to one of the owner's own policies
        if (this.table === 'documents' && row.policy_id) {
          const policy = (this.allTables.policies ?? []).find((p) => p.id === row.policy_id)
          if (!policy || policy.owner_id !== this.me?.id) return rls
        }
        if (this.table === 'nominees' && row.nominee_email === this.me?.email) return rls // no self-nomination
        const duplicate =
          (this.table === 'policies' &&
            this.rows.some((r) => r.owner_id === row.owner_id && r.insurer === row.insurer && r.policy_number === row.policy_number)) ||
          (this.table === 'nominees' && this.rows.some((r) => r.owner_id === row.owner_id && r.nominee_email === row.nominee_email))
        if (duplicate) {
          return { data: null, error: { code: '23505', message: 'duplicate key value violates unique constraint' } }
        }
        this.rows.push(row)
        created.push(row)
      }
      return { data: this.returning ? created : null, error: null }
    }

    if (this.op === 'update') {
      const hit = matches()
      for (const row of hit) Object.assign(row, this.payload, this.table === 'policies' ? { updated_at: new Date().toISOString() } : {})
      return { data: this.returning ? hit : null, error: null }
    }

    if (this.op === 'delete') {
      const hit = matches()
      for (const row of hit) this.rows.splice(this.rows.indexOf(row), 1)
      return { data: this.returning ? hit : null, error: null }
    }

    let result = matches()
    if (this.sort) {
      const [column, ascending] = this.sort
      result = [...result].sort((a, b) => (a[column] < b[column] ? -1 : a[column] > b[column] ? 1 : 0) * (ascending ? 1 : -1))
    }
    return { data: result.map((r) => ({ ...r })), error: null }
  }
}
