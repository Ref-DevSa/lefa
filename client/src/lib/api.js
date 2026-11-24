/**
 * The browser's connection to the Lefa API. Every request carries the
 * user's login token, so the API (and then the database's RLS) knows who
 * is asking. Errors arrive in the API's shape { error: { code, message,
 * fields? } } and are turned into an ApiError the screens can show.
 */

export class ApiError extends Error {
  /**
   * @param {number} status HTTP status (0 = couldn't reach the server)
   * @param {string} code e.g. 'validation_failed'
   * @param {string} message safe to show to the user
   * @param {Record<string, string>} [fields] per-field messages for forms
   */
  constructor(status, code, message, fields) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.fields = fields
  }
}

/** @typedef {Record<string, any>} Policy */
/** @typedef {{ policy_count: number, active_count: number, total_active_cover: number, monthly_premiums: number, insurer_count: number }} VaultSummary */

/**
 * @param {{
 *   baseUrl?: string,
 *   getToken: () => Promise<string | null>,
 *   fetchImpl?: typeof fetch,
 *   onUnauthorized?: () => void,
 * }} options
 */
export function createApi({ baseUrl = '', getToken, fetchImpl = (input, init) => fetch(input, init), onUnauthorized }) {
  /**
   * @param {'GET' | 'POST' | 'PATCH' | 'DELETE'} method
   * @param {string} path
   * @param {unknown} [body]
   */
  async function request(method, path, body) {
    const token = await getToken()
    /** @type {Record<string, string>} */
    const headers = {}
    if (token) headers.Authorization = `Bearer ${token}`
    if (body !== undefined) headers['Content-Type'] = 'application/json'

    let res
    try {
      res = await fetchImpl(`${baseUrl}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      })
    } catch {
      throw new ApiError(0, 'network_error', "We couldn't reach Lefa. Check your connection and try again.")
    }

    if (res.status === 204) return null
    const data = await res.json().catch(() => null)
    if (!res.ok) {
      if (res.status === 401) onUnauthorized?.()
      const e = data?.error
      throw new ApiError(res.status, e?.code ?? 'http_error', e?.message ?? 'Something went wrong. Try again.', e?.fields)
    }
    return data
  }

  const policyPath = (/** @type {string} */ id) => `/api/policies/${encodeURIComponent(id)}`

  return {
    /** @returns {Promise<Policy[]>} */
    listPolicies: async () => (await request('GET', '/api/policies')).policies,
    /** @param {string} id @returns {Promise<Policy>} */
    getPolicy: async (id) => (await request('GET', policyPath(id))).policy,
    /** @returns {Promise<VaultSummary>} */
    getSummary: async () => (await request('GET', '/api/vault/summary')).summary,
    /** @param {Policy} values @returns {Promise<Policy>} */
    createPolicy: async (values) => (await request('POST', '/api/policies', values)).policy,
    /** @param {string} id @param {Policy} values @returns {Promise<Policy>} */
    updatePolicy: async (id, values) => (await request('PATCH', policyPath(id), values)).policy,
    /** @param {string} id @returns {Promise<void>} */
    deletePolicy: async (id) => {
      await request('DELETE', policyPath(id))
    },
  }
}

/** @typedef {ReturnType<typeof createApi>} Api */
