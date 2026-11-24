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
 * @param {{ users?: FakeUser[], policies?: Row[], authDown?: boolean, dbError?: boolean }} [options]
 */
export function createFakeSupabase({ users = [], policies = [], authDown = false, dbError = false } = {}) {
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
  }

  return {
    clientsCreatedWith,
    tables,
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
        /** @param {string} table */
        from(table) {
          if (!tables[table]) throw new Error(`fake supabase: unexpected table ${table}`)
          return new Query(tables[table], table, me, dbError)
        },
      }
    },
  }
}

class Query {
  /**
   * @param {Row[]} rows @param {string} table
   * @param {FakeUser | undefined} me @param {boolean} dbError
   */
  constructor(rows, table, me, dbError) {
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
    return this.table === 'profiles' ? row.id === this.me.id : row.owner_id === this.me.id
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
          ...POLICY_DEFAULTS,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          ...input,
        }
        if (row.owner_id !== this.me?.id) {
          return { data: null, error: { code: '42501', message: 'new row violates row-level security policy' } }
        }
        const duplicate = this.rows.some(
          (r) => r.owner_id === row.owner_id && r.insurer === row.insurer && r.policy_number === row.policy_number,
        )
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
      for (const row of hit) Object.assign(row, this.payload, { updated_at: new Date().toISOString() })
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
