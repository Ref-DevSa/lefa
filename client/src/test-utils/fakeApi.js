import { ApiError } from '../lib/api.js'

/**
 * In-memory stand-in for the Lefa API client (src/lib/api.js) for screen
 * tests. Behaves like the real API for the cases the screens care about.
 *
 * Special inputs to trigger server-side errors:
 *   policy_number 'DUP'          -> 409 duplicate_policy
 *   insurer 'Server Says No'     -> 400 with a field message on insurer
 *
 * @param {{ policies?: Array<Record<string, any>>, failList?: boolean }} [options]
 */
export function createFakeApi({ policies = [], failList = false } = {}) {
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

  /** @param {string} id */
  const find = (id) => {
    const row = rows.find((r) => r.id === id)
    if (!row) throw new ApiError(404, 'not_found', 'That policy was not found.')
    return row
  }

  return {
    calls,
    rows: () => rows,

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
    },
  }
}
