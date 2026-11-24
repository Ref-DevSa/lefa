import { randomUUID } from 'node:crypto'

/**
 * In-memory stand-in for the server's Supabase factory, for API tests.
 *
 * - Each known token maps to a user; `forUser(token)` returns a client acting
 *   as that user.
 * - Tables, storage and database functions mimic the real Row Level Security
 *   rules closely enough for the API's behaviour to be tested:
 *     owners see their own rows; admins see everything;
 *     accepted nominees see an owner's vault only after a VERIFIED death;
 *     a broker sees the clients they're linked to.
 * - Supports the slice of the query builder the API uses:
 *   select / insert / update / delete, eq, neq, in, order, single, maybeSingle.
 *
 * The real rules are tested against the database with pgTAP (supabase/tests).
 */

/** @typedef {'member' | 'broker' | 'admin'} Role */
/** @typedef {{ token: string, id: string, email: string, full_name?: string, phone?: string | null, role?: Role, hasProfile?: boolean }} FakeUser */
/** @typedef {Record<string, any>} Row */

const now = () => new Date().toISOString()

const POLICY_DEFAULTS = {
  type: 'funeral',
  cover_amount: 0,
  monthly_premium: 0,
  debit_day: null,
  status: 'active',
  beneficiaries: '',
  notes: '',
}

const RLS_ERROR = { code: '42501', message: 'new row violates row-level security policy' }

/**
 * @param {{ users?: FakeUser[], policies?: Row[], documents?: Row[], nominees?: Row[], deathReports?: Row[],
 *   claims?: Row[], claimEvents?: Row[], brokerClients?: Row[], files?: Record<string, Buffer>,
 *   certificates?: Record<string, Buffer>, authDown?: boolean, dbError?: boolean, storageDown?: boolean }} [options]
 */
export function createFakeSupabase({
  users = [],
  policies = [],
  documents = [],
  nominees = [],
  deathReports = [],
  claims = [],
  claimEvents = [],
  brokerClients = [],
  files = {},
  certificates = {},
  authDown = false,
  dbError = false,
  storageDown = false,
} = {}) {
  /** @type {string[]} tokens each user client was created with */
  const clientsCreatedWith = []

  /** @type {Record<string, Row[]>} */
  const tables = {
    profiles: users
      .filter((u) => u.hasProfile !== false)
      .map((u) => ({ id: u.id, email: u.email, full_name: u.full_name ?? '', phone: u.phone ?? null, role: u.role ?? 'member' })),
    policies: policies.map((p) => ({ id: randomUUID(), ...POLICY_DEFAULTS, created_at: now(), updated_at: now(), ...p })),
    documents: documents.map((d) => ({ id: randomUUID(), policy_id: null, created_at: now(), ...d })),
    nominees: nominees.map((n) => ({ id: randomUUID(), nominee_id: null, status: 'invited', created_at: now(), updated_at: now(), ...n })),
    death_reports: deathReports.map((d) => ({
      id: randomUUID(),
      status: 'pending',
      dha_reference: '',
      notes: '',
      reviewed_by: null,
      reviewed_at: null,
      rejection_reason: null,
      created_at: now(),
      ...d,
    })),
    claims: claims.map((c) => ({ id: randomUUID(), status: 'not_started', created_at: now(), updated_at: now(), ...c })),
    claim_events: claimEvents.map((e) => ({ id: randomUUID(), note: '', created_at: now(), ...e })),
    broker_clients: brokerClients.map((b) => ({ created_at: now(), ...b })),
  }
  /** Files in the private "vault" bucket, by path. */
  const storage = new Map(Object.entries(files))
  /** Files in the private "death-certificates" bucket, by path. */
  const certificateStore = new Map(Object.entries(certificates))

  return {
    clientsCreatedWith,
    tables,
    storage,
    certificates: certificateStore,
    /** @param {string} token */
    forUser(token) {
      clientsCreatedWith.push(token)
      const me = users.find((u) => u.token === token)
      const rules = accessRules(tables, me)

      return {
        auth: {
          /** @param {string} jwt */
          async getUser(jwt) {
            if (authDown) return { data: { user: null }, error: { name: 'AuthRetryableFetchError', status: 0, message: 'fetch failed' } }
            const match = users.find((u) => u.token === jwt)
            if (!match) return { data: { user: null }, error: { name: 'AuthApiError', status: 403, message: 'invalid JWT' } }
            return { data: { user: { id: match.id, email: match.email } }, error: null }
          },
        },

        /** Database functions (supabase.rpc). @param {string} fn @param {Record<string, any>} [args] */
        async rpc(fn, args = {}) {
          if (dbError) return { data: null, error: { code: 'XX000', message: 'connection reset (secret detail)' } }
          if (!me) return { data: null, error: RLS_ERROR }
          if (fn === 'my_nominations') return { data: rules.myNominations(), error: null }
          if (fn === 'update_claim_status') return rules.updateClaimStatus(args.claim_id, args.new_status, args.note)
          if (fn === 'verify_death_report') return rules.verifyDeathReport(args.report_id)
          if (fn === 'reject_death_report') return rules.rejectDeathReport(args.report_id, args.reason)
          throw new Error(`fake supabase: unexpected rpc ${fn}`)
        },

        /** @param {string} table */
        from(table) {
          if (!tables[table]) throw new Error(`fake supabase: unexpected table ${table}`)
          return new Query(tables[table], table, me, dbError, rules)
        },

        storage: {
          /** @param {string} bucket */
          from(bucket) {
            const denied = { statusCode: '403', message: 'new row violates row-level security policy' }
            if (bucket === 'vault') {
              const own = (/** @type {string} */ path) => !!me && path.startsWith(`${me.id}/`)
              const readable = (/** @type {string} */ path) => own(path) || rules.canReadVaultOf(path.split('/')[0])
              return bucketApi(storage, 'vault', {
                canWrite: own,
                canRead: readable,
                canDelete: (path) => own(path) || me?.role === 'admin',
                storageDown,
                denied,
              })
            }
            if (bucket === 'death-certificates') {
              const ownerOf = (/** @type {string} */ path) => path.split('/')[0]
              return bucketApi(certificateStore, 'death-certificates', {
                canWrite: (path) => rules.isNomineeOf(ownerOf(path)),
                canRead: (path) => rules.isNomineeOf(ownerOf(path)) || rules.isBrokerOf(ownerOf(path)) || me?.role === 'admin',
                canDelete: (path) => rules.isNomineeOf(ownerOf(path)),
                storageDown,
                denied,
              })
            }
            throw new Error(`fake supabase: unexpected bucket ${bucket}`)
          },
        },
      }
    },
  }
}

/**
 * @param {Map<string, Buffer>} store @param {string} bucket
 * @param {{ canWrite: (p: string) => boolean, canRead: (p: string) => boolean, canDelete: (p: string) => boolean,
 *   storageDown: boolean, denied: Record<string, string> }} rules
 */
function bucketApi(store, bucket, { canWrite, canRead, canDelete, storageDown, denied }) {
  return {
    /** @param {string} path @param {Buffer} body */
    async upload(path, body) {
      if (storageDown) return { data: null, error: { statusCode: '500', message: 'storage unavailable' } }
      if (!canWrite(path)) return { data: null, error: denied }
      store.set(path, body)
      return { data: { path }, error: null }
    },
    /** @param {string[]} paths */
    async remove(paths) {
      for (const p of paths) if (canDelete(p)) store.delete(p)
      return { data: [], error: null }
    },
    /** @param {string} path @param {number} expiresIn */
    async createSignedUrl(path, expiresIn) {
      if (!canRead(path) || !store.has(path)) return { data: null, error: { statusCode: '404', message: 'Object not found' } }
      return { data: { signedUrl: `https://storage.test/${bucket}/${path}?token=signed&expires=${expiresIn}` }, error: null }
    },
  }
}

/**
 * The access rules, as the signed-in user `me` experiences them.
 * @param {Record<string, Row[]>} tables @param {FakeUser | undefined} me
 */
function accessRules(tables, me) {
  const isAdmin = () => me?.role === 'admin'
  /** @param {string} owner */
  const isNomineeOf = (owner) =>
    !!me && tables.nominees.some((n) => n.owner_id === owner && n.nominee_id === me.id && n.status === 'accepted')
  /** @param {string} owner */
  const isDeceased = (owner) => tables.death_reports.some((d) => d.owner_id === owner && d.status === 'verified')
  /** @param {string} owner */
  const isUnlocked = (owner) => isNomineeOf(owner) && isDeceased(owner)
  /** @param {string} client */
  const isBrokerOf = (client) =>
    !!me && me.role === 'broker' && tables.broker_clients.some((b) => b.broker_id === me.id && b.client_id === client)
  /** @param {string} owner */
  const canReadVaultOf = (owner) => isAdmin() || isUnlocked(owner) || isBrokerOf(owner)
  /** @param {string} claimId */
  const canSeeClaim = (claimId) => {
    const claim = tables.claims.find((c) => c.id === claimId)
    const policy = claim && tables.policies.find((p) => p.id === claim.policy_id)
    return !!policy && canReadVaultOf(policy.owner_id)
  }

  return {
    isNomineeOf,
    isDeceased,
    isBrokerOf,
    canReadVaultOf,

    /** @param {string} table @param {Row} row */
    visible(table, row) {
      if (!me) return false
      if (isAdmin()) return true
      switch (table) {
        case 'profiles':
          return (
            row.id === me.id ||
            isUnlocked(row.id) ||
            isBrokerOf(row.id) ||
            // migration 006: the broker sees whoever reported a death for one of their clients
            tables.death_reports.some((d) => d.reported_by === row.id && isBrokerOf(d.owner_id))
          )
        case 'nominees':
          return row.owner_id === me.id || row.nominee_id === me.id || row.nominee_email === me.email || isBrokerOf(row.owner_id)
        case 'death_reports':
          return row.reported_by === me.id || isNomineeOf(row.owner_id) || isBrokerOf(row.owner_id)
        case 'claims':
          return canSeeClaim(row.id)
        case 'claim_events':
          return canSeeClaim(row.claim_id)
        case 'broker_clients':
          return row.broker_id === me.id || row.client_id === me.id
        default: // policies, documents
          return row.owner_id === me.id || canReadVaultOf(row.owner_id)
      }
    },

    /** Insert checks, like RLS "with check". @param {string} table @param {Row} row */
    canInsert(table, row) {
      if (!me) return false
      if (table === 'death_reports') return row.reported_by === me.id && row.status === 'pending' && isNomineeOf(row.owner_id)
      if (row.owner_id !== me.id) return false
      if ((table === 'policies' || table === 'documents') && isDeceased(me.id)) return false
      if (table === 'documents' && row.policy_id) {
        const policy = tables.policies.find((p) => p.id === row.policy_id)
        if (!policy || policy.owner_id !== me.id) return false
      }
      if (table === 'nominees' && row.nominee_email === me.email) return false
      return true
    },

    myNominations() {
      if (!me) return []
      return tables.nominees
        .filter((n) => (n.nominee_id === me.id || n.nominee_email === me.email) && ['invited', 'accepted'].includes(n.status))
        .map((n) => ({
          id: n.id,
          owner_id: n.owner_id,
          owner_name: tables.profiles.find((p) => p.id === n.owner_id)?.full_name ?? '',
          relationship: n.relationship,
          status: n.status,
          created_at: n.created_at,
        }))
    },

    /** @param {string} claimId @param {string} status @param {string | null | undefined} note */
    updateClaimStatus(claimId, status, note) {
      if (!canSeeClaim(claimId)) return { data: null, error: { code: '42501', message: "You can't update this claim" } }
      const claim = /** @type {Row} */ (tables.claims.find((c) => c.id === claimId))
      if (claim.status === status) return { data: null, error: { code: '22023', message: `The claim is already ${status}` } }
      if (['paid', 'rejected'].includes(claim.status) && !isAdmin()) return { data: null, error: { code: '22023', message: 'This claim is closed' } }
      tables.claim_events.push({ id: randomUUID(), claim_id: claimId, actor_id: me?.id, from_status: claim.status, to_status: status, note: (note ?? '').trim(), created_at: now() })
      claim.status = status
      claim.updated_at = now()
      return { data: status, error: null }
    },

    /** @param {string} reportId */
    verifyDeathReport(reportId) {
      const report = tables.death_reports.find((d) => d.id === reportId)
      if (!report || !(isBrokerOf(report.owner_id) || isAdmin())) {
        return { data: null, error: { code: '42501', message: "Only the family's broker or an admin can verify this report" } }
      }
      if (report.status !== 'pending') return { data: null, error: { code: '22023', message: `This report is already ${report.status}` } }
      Object.assign(report, { status: 'verified', reviewed_by: me?.id, reviewed_at: now() })
      let created = 0
      for (const p of tables.policies.filter((x) => x.owner_id === report.owner_id && ['active', 'paid_up'].includes(x.status))) {
        if (tables.claims.some((c) => c.policy_id === p.id)) continue
        const claim = { id: randomUUID(), policy_id: p.id, death_report_id: report.id, status: 'not_started', created_at: now(), updated_at: now() }
        tables.claims.push(claim)
        tables.claim_events.push({ id: randomUUID(), claim_id: claim.id, actor_id: me?.id, from_status: null, to_status: 'not_started', note: 'Claim opened after the death was verified', created_at: now() })
        created++
      }
      return { data: created, error: null }
    },

    /** @param {string} reportId @param {string} reason */
    rejectDeathReport(reportId, reason) {
      const report = tables.death_reports.find((d) => d.id === reportId)
      if (!report || !(isBrokerOf(report.owner_id) || isAdmin())) {
        return { data: null, error: { code: '42501', message: "Only the family's broker or an admin can reject this report" } }
      }
      if (report.status !== 'pending') return { data: null, error: { code: '22023', message: `This report is already ${report.status}` } }
      if (!reason || !reason.trim()) return { data: null, error: { code: '22023', message: 'Give a reason so the family knows what to fix' } }
      Object.assign(report, { status: 'rejected', reviewed_by: me?.id, reviewed_at: now(), rejection_reason: reason.trim() })
      return { data: null, error: null }
    },
  }
}

class Query {
  /**
   * @param {Row[]} rows @param {string} table @param {FakeUser | undefined} me
   * @param {boolean} dbError @param {ReturnType<typeof accessRules>} rules
   */
  constructor(rows, table, me, dbError, rules) {
    this.rows = rows
    this.table = table
    this.me = me
    this.dbError = dbError
    this.rules = rules
    /** @type {'select' | 'insert' | 'update' | 'delete'} */
    this.op = 'select'
    /** @type {Array<(row: Row) => boolean>} */
    this.filters = []
    /** @type {any} */
    this.payload = null
    /** @type {[string, boolean] | null} */
    this.sort = null
    this.returning = false
    /** @type {string[] | null} */
    this.columns = null
  }

  /** Like PostgREST, only the requested columns come back. @param {string} [columns] */
  select(columns = '*') {
    this.returning = true
    const list = columns.split(',').map((c) => c.trim())
    this.columns = columns.includes('*') || columns.includes('(') ? null : list
    return this
  }

  /** @param {Row} row */
  pick(row) {
    if (!this.columns) return { ...row }
    return Object.fromEntries(this.columns.map((c) => [c, row[c]]))
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
    this.filters.push((r) => r[column] === value)
    return this
  }
  /** @param {string} column @param {any} value */
  neq(column, value) {
    this.filters.push((r) => r[column] !== value)
    return this
  }
  /** @param {string} column @param {any[]} values */
  in(column, values) {
    this.filters.push((r) => values.includes(r[column]))
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

  /** @param {Row} input */
  withDefaults(input) {
    const base = { id: randomUUID(), created_at: now() }
    switch (this.table) {
      case 'policies':
        return { ...base, owner_id: this.me?.id, ...POLICY_DEFAULTS, updated_at: now(), ...input }
      case 'nominees':
        return { ...base, owner_id: this.me?.id, nominee_id: null, status: 'invited', updated_at: now(), ...input }
      case 'death_reports':
        return { ...base, reported_by: this.me?.id, status: 'pending', dha_reference: '', notes: '', reviewed_by: null, reviewed_at: null, rejection_reason: null, ...input }
      default:
        return { ...base, owner_id: this.me?.id, policy_id: null, ...input }
    }
  }

  /** @param {Row} row */
  isDuplicate(row) {
    if (this.table === 'policies') {
      return this.rows.some((r) => r.owner_id === row.owner_id && r.insurer === row.insurer && r.policy_number === row.policy_number)
    }
    if (this.table === 'nominees') return this.rows.some((r) => r.owner_id === row.owner_id && r.nominee_email === row.nominee_email)
    if (this.table === 'death_reports') return this.rows.some((r) => r.owner_id === row.owner_id && r.status !== 'rejected')
    return false
  }

  async run() {
    if (this.dbError) return { data: null, error: { code: 'XX000', message: 'connection reset (secret detail)' } }
    const matches = () => this.rows.filter((r) => this.rules.visible(this.table, r) && this.filters.every((f) => f(r)))

    if (this.op === 'insert') {
      const created = []
      for (const input of this.payload) {
        const row = this.withDefaults(input)
        if (!this.rules.canInsert(this.table, row)) return { data: null, error: RLS_ERROR }
        if (this.isDuplicate(row)) return { data: null, error: { code: '23505', message: 'duplicate key value violates unique constraint' } }
        this.rows.push(row)
        created.push(row)
      }
      return { data: this.returning ? created.map((r) => this.pick(r)) : null, error: null }
    }

    if (this.op === 'update') {
      // Like RLS: you can only change your own rows (nominees: their own invitation).
      const hit = matches().filter((r) =>
        this.table === 'nominees' ? r.owner_id === this.me?.id || r.nominee_id === this.me?.id || r.nominee_email === this.me?.email : r.owner_id === this.me?.id || this.me?.role === 'admin',
      )
      for (const row of hit) Object.assign(row, this.payload, this.table === 'policies' || this.table === 'nominees' ? { updated_at: now() } : {})
      return { data: this.returning ? hit.map((r) => this.pick(r)) : null, error: null }
    }

    if (this.op === 'delete') {
      const hit = matches().filter((r) => r.owner_id === this.me?.id)
      for (const row of hit) this.rows.splice(this.rows.indexOf(row), 1)
      return { data: this.returning ? hit.map((r) => ({ ...r })) : null, error: null }
    }

    let result = matches()
    if (this.sort) {
      const [column, ascending] = this.sort
      result = [...result].sort((a, b) => (a[column] < b[column] ? -1 : a[column] > b[column] ? 1 : 0) * (ascending ? 1 : -1))
    }
    return { data: result.map((r) => this.pick(r)), error: null }
  }
}
