import { ApiError } from '../lib/api.js'

/**
 * In-memory stand-in for the Lefa API client (src/lib/api.js) for screen
 * tests. Behaves like the real API for the cases the screens care about.
 *
 * Special inputs to trigger server-side errors:
 *   policy_number 'DUP'          -> 409 duplicate_policy
 *   insurer 'Server Says No'     -> 400 with a field message on insurer
 *
 *   upload with a file named '*.bad'  -> 415 unsupported_file_type
 *
 *   invite 'limit@x.co'           -> 422 nominee_limit
 *
 * @param {{ policies?: Array<Record<string, any>>, documents?: Array<Record<string, any>>,
 *   nominees?: Array<Record<string, any>>, nominations?: Array<Record<string, any>>,
 *   vaults?: Record<string, Record<string, any>>, broker?: { overview?: Record<string, any>, activity?: any[],
 *   reports?: Array<Record<string, any>>, claims?: Array<Record<string, any>>, events?: Record<string, any[]> },
 *   failList?: boolean }} [options]
 */
export function createFakeApi({ policies = [], documents = [], nominees = [], nominations = [], vaults = {}, broker = {}, failList = false } = {}) {
  let nextId = policies.length + 1
  /** @type {Array<Record<string, any>>} */
  let rows = policies.map((p, i) => ({
    id: `p${i + 1}`,
    owner_id: 'u-thandi',
    type: 'funeral',
    cover_amount: 0,
    monthly_premium: 0,
    debit_day: null,
    status: 'active',
    beneficiaries: '',
    notes: '',
    created_at: `2026-11-${String(10 + i).padStart(2, '0')}T10:00:00Z`,
    updated_at: `2026-11-${String(10 + i).padStart(2, '0')}T10:00:00Z`,
    ...p,
  }))
  /** @type {any[]} */
  const calls = []
  let nextNominee = nominees.length + 1
  /** @type {Array<Record<string, any>>} people Thandi nominated */
  let myNominees = nominees.map((n, i) => ({ id: `n${i + 1}`, owner_id: 'u-thandi', nominee_id: null, status: 'invited', created_at: `2026-11-1${i}T08:00:00Z`, ...n }))
  /** @type {Array<Record<string, any>>} where the signed-in user is the nominee */
  let forMe = nominations.map((n, i) => ({
    id: `m${i + 1}`,
    status: 'invited',
    created_at: '2026-11-20T08:00:00Z',
    vault: { state: 'locked', report_status: null, rejection_reason: null },
    ...n,
  }))
  /** @type {Record<string, Record<string, any>>} unlocked vaults by owner id */
  const vaultStore = JSON.parse(JSON.stringify(vaults))
  const brokerState = JSON.parse(
    JSON.stringify({
      overview: { clients: 0, pending_reports: 0, open_claims: 0, paid_this_month: 0 },
      activity: [],
      reports: [],
      claims: [],
      events: {},
      ...broker,
    }),
  )
  let nextDoc = documents.length + 1
  /** @type {Array<Record<string, any>>} */
  let docs = documents.map((d, i) => ({
    id: `d${i + 1}`,
    owner_id: 'u-thandi',
    policy_id: null,
    mime_type: 'application/pdf',
    size_bytes: 120000,
    created_at: `2026-11-2${i}T08:00:00Z`,
    ...d,
  }))

  /** @param {string} id */
  const find = (id) => {
    const row = rows.find((r) => r.id === id)
    if (!row) throw new ApiError(404, 'not_found', 'That policy was not found.')
    return row
  }

  return {
    calls,
    rows: () => rows,
    docs: () => docs,
    nominees: () => myNominees,
    nominations: () => forMe,

    async listPolicies() {
      calls.push(['listPolicies'])
      if (failList) throw new ApiError(500, 'internal_error', 'Something went wrong. Try again.')
      return [...rows].sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    },

    /** @param {string} id */
    async getPolicy(id) {
      calls.push(['getPolicy', id])
      return { ...find(id) }
    },

    async getSummary() {
      calls.push(['getSummary'])
      const active = rows.filter((r) => r.status === 'active')
      const cents = (/** @type {string} */ k) => active.reduce((s, r) => s + Math.round(r[k] * 100), 0) / 100
      return {
        policy_count: rows.length,
        active_count: active.length,
        total_active_cover: cents('cover_amount'),
        monthly_premiums: cents('monthly_premium'),
        insurer_count: new Set(active.map((r) => r.insurer.toLowerCase())).size,
      }
    },

    /** @param {Record<string, any>} values */
    async createPolicy(values) {
      calls.push(['createPolicy', values])
      if (values.policy_number === 'DUP') {
        throw new ApiError(409, 'duplicate_policy', "You've already added this policy to your vault.")
      }
      if (values.insurer === 'Server Says No') {
        throw new ApiError(400, 'validation_failed', 'Check the highlighted fields.', { insurer: 'The server rejected this insurer.' })
      }
      const row = { ...values, id: `p${nextId++}`, owner_id: 'u-thandi', created_at: '2026-11-30T10:00:00Z', updated_at: '2026-11-30T10:00:00Z' }
      rows.push(row)
      return row
    },

    /** @param {string} id @param {Record<string, any>} values */
    async updatePolicy(id, values) {
      calls.push(['updatePolicy', id, values])
      const row = find(id)
      Object.assign(row, values)
      return { ...row }
    },

    /** @param {string} id */
    async deletePolicy(id) {
      calls.push(['deletePolicy', id])
      find(id)
      rows = rows.filter((r) => r.id !== id)
      docs = docs.map((d) => (d.policy_id === id ? { ...d, policy_id: null } : d))
    },

    async listDocuments() {
      calls.push(['listDocuments'])
      return docs.map((d) => ({ ...d })).sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    },

    /** @param {{ file: File, doc_type: string, policy_id?: string | null }} input */
    async uploadDocument({ file, doc_type, policy_id }) {
      calls.push(['uploadDocument', { name: file.name, doc_type, policy_id: policy_id || null }])
      if (file.name.endsWith('.bad')) throw new ApiError(415, 'unsupported_file_type', 'Upload a PDF, JPG or PNG file.')
      const doc = {
        id: `d${nextDoc++}`,
        owner_id: 'u-thandi',
        policy_id: policy_id || null,
        doc_type,
        file_name: file.name,
        mime_type: file.type,
        size_bytes: file.size,
        created_at: '2026-11-30T09:00:00Z',
      }
      docs.push(doc)
      return doc
    },

    /** @param {string} id */
    async getDocumentUrl(id) {
      calls.push(['getDocumentUrl', id])
      if (!docs.some((d) => d.id === id)) throw new ApiError(404, 'not_found', 'That document was not found.')
      return `https://storage.test/${id}?token=signed`
    },

    async listNominees() {
      calls.push(['listNominees'])
      return myNominees.map((n) => ({ ...n })) // fresh copies, like a real API
    },

    /** @param {{ email: string, relationship: string }} values */
    async inviteNominee(values) {
      calls.push(['inviteNominee', values])
      if (values.email === 'limit@x.co') throw new ApiError(422, 'nominee_limit', 'You can have up to 3 nominees. Revoke one to invite someone else.')
      if (myNominees.some((n) => n.nominee_email === values.email)) throw new ApiError(409, 'duplicate_nominee', "You've already invited this person.")
      const row = { id: `n${nextNominee++}`, owner_id: 'u-thandi', nominee_email: values.email, relationship: values.relationship, status: 'invited', nominee_id: null, created_at: '2026-11-30T08:00:00Z' }
      myNominees.unshift(row)
      return row
    },

    /** @param {string} id @param {string} action */
    async updateNominee(id, action) {
      calls.push(['updateNominee', id, action])
      const to = { accept: 'accepted', decline: 'declined', revoke: 'revoked', reinvite: 'invited' }[action]
      const mine = myNominees.find((n) => n.id === id)
      if (mine) {
        mine.status = to
        return { nominee: { ...mine } }
      }
      const theirs = forMe.find((n) => n.id === id)
      if (!theirs) throw new ApiError(404, 'not_found', 'That nomination was not found.')
      theirs.status = to
      forMe = forMe.filter((n) => n.status === 'invited' || n.status === 'accepted')
      return { nomination: { id, status: to } }
    },

    /** @param {{ ownerId: string, dateOfDeath: string, dhaReference?: string, notes?: string, certificate: File }} input */
    async reportDeath(input) {
      calls.push(['reportDeath', { ownerId: input.ownerId, dateOfDeath: input.dateOfDeath, dhaReference: input.dhaReference, file: input.certificate.name }])
      if (input.certificate.name.endsWith('.bad')) throw new ApiError(415, 'unsupported_file_type', 'Upload the certificate as a PDF, JPG or PNG.')
      const n = forMe.find((x) => x.owner_id === input.ownerId)
      if (n) n.vault = { state: 'under_review', report_status: 'pending', rejection_reason: null }
      return { id: 'r-new', owner_id: input.ownerId, status: 'pending' }
    },

    /** @param {string} ownerId */
    async getVault(ownerId) {
      calls.push(['getVault', ownerId])
      const v = vaultStore[ownerId]
      if (!v) throw new ApiError(403, 'vault_locked', 'This vault is locked. It opens once a broker has verified the death.')
      return JSON.parse(JSON.stringify(v))
    },

    /** @param {string} ownerId @param {string} docId */
    async getVaultDocumentUrl(ownerId, docId) {
      calls.push(['getVaultDocumentUrl', ownerId, docId])
      return `https://storage.test/vault/${ownerId}/${docId}?token=signed`
    },

    /** @param {string} id @param {{ status: string, note?: string }} values */
    async updateClaim(id, values) {
      calls.push(['updateClaim', id, values])
      for (const v of Object.values(vaultStore)) {
        const claim = v.claims.find((/** @type {any} */ c) => c.id === id)
        if (!claim) continue
        if (claim.status === values.status) throw new ApiError(409, 'invalid_transition', `The claim is already ${values.status}`)
        claim.events.push({ id: `e${claim.events.length + 1}`, claim_id: id, from_status: claim.status, to_status: values.status, note: values.note ?? '', created_at: '2026-11-30T10:00:00Z' })
        claim.status = values.status
        return { id, status: values.status }
      }
      const brokerClaim = brokerState.claims.find((/** @type {any} */ c) => c.id === id)
      if (brokerClaim) {
        if (brokerClaim.status === values.status) throw new ApiError(409, 'invalid_transition', `The claim is already ${values.status}`)
        ;(brokerState.events[id] ??= []).push({ id: `be${Date.now()}`, claim_id: id, from_status: brokerClaim.status, to_status: values.status, note: values.note ?? '', created_at: '2026-11-30T10:00:00Z' })
        brokerClaim.status = values.status
        return { id, status: values.status }
      }
      throw new ApiError(403, 'forbidden', "You can't update this claim.")
    },

    async getBrokerOverview() {
      calls.push(['getBrokerOverview'])
      return { overview: { ...brokerState.overview }, activity: [...brokerState.activity] }
    },
    /** @param {string} [status] */
    async listReports(status = 'pending') {
      calls.push(['listReports', status])
      return brokerState.reports.filter((/** @type {any} */ r) => r.status === status).map((/** @type {any} */ r) => ({ ...r }))
    },
    /** @param {string} id */
    async getReport(id) {
      calls.push(['getReport', id])
      const r = brokerState.reports.find((/** @type {any} */ x) => x.id === id)
      if (!r) throw new ApiError(404, 'not_found', 'That report was not found.')
      return JSON.parse(JSON.stringify(r))
    },
    /** @param {string} id */
    async verifyReport(id) {
      calls.push(['verifyReport', id])
      const r = brokerState.reports.find((/** @type {any} */ x) => x.id === id)
      if (!r || r.status !== 'pending') throw new ApiError(409, 'invalid_transition', 'This report is already reviewed')
      r.status = 'verified'
      brokerState.overview.pending_reports -= 1
      return { report: { id, status: 'verified' }, claims_created: (r.policies ?? []).filter((/** @type {any} */ p) => p.will_claim).length }
    },
    /** @param {string} id @param {string} reason */
    async rejectReport(id, reason) {
      calls.push(['rejectReport', id, reason])
      const r = brokerState.reports.find((/** @type {any} */ x) => x.id === id)
      if (!r) throw new ApiError(404, 'not_found', 'That report was not found.')
      r.status = 'rejected'
      r.rejection_reason = reason
      brokerState.overview.pending_reports -= 1
      return { report: { id, status: 'rejected' } }
    },
    async listBrokerClaims() {
      calls.push(['listBrokerClaims'])
      return brokerState.claims.map((/** @type {any} */ c) => ({ ...c }))
    },
    /** @param {string} id */
    async getClaimEvents(id) {
      calls.push(['getClaimEvents', id])
      return (brokerState.events[id] ?? []).map((/** @type {any} */ e) => ({ ...e }))
    },

    async listNominations() {
      calls.push(['listNominations'])
      return forMe.map((n) => ({ ...n }))
    },

    /** @param {string} id */
    async deleteDocument(id) {
      calls.push(['deleteDocument', id])
      docs = docs.filter((d) => d.id !== id)
    },
  }
}
