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
/** @typedef {Record<string, any>} Document */
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
    // Files go as a multipart form; the browser sets that Content-Type itself.
    const isForm = typeof FormData !== 'undefined' && body instanceof FormData
    if (body !== undefined && !isForm) headers['Content-Type'] = 'application/json'

    let res
    try {
      res = await fetchImpl(`${baseUrl}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
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
  const documentPath = (/** @type {string} */ id) => `/api/documents/${encodeURIComponent(id)}`

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

    /** @returns {Promise<Document[]>} */
    listDocuments: async () => (await request('GET', '/api/documents')).documents,
    /**
     * @param {{ file: File, doc_type: string, policy_id?: string | null }} input
     * @returns {Promise<Document>}
     */
    uploadDocument: async ({ file, doc_type, policy_id }) => {
      const form = new FormData()
      form.append('doc_type', doc_type)
      form.append('policy_id', policy_id ?? '')
      form.append('file', file, file.name)
      return (await request('POST', '/api/documents', form)).document
    },
    /** A short-lived (60s) link to view a private file. @param {string} id @returns {Promise<string>} */
    getDocumentUrl: async (id) => (await request('GET', `${documentPath(id)}/url`)).url,
    /** @param {string} id @returns {Promise<void>} */
    deleteDocument: async (id) => {
      await request('DELETE', documentPath(id))
    },

    /** People I've nominated. @returns {Promise<Record<string, any>[]>} */
    listNominees: async () => (await request('GET', '/api/nominees')).nominees,
    /** @param {{ email: string, relationship: string }} values @returns {Promise<Record<string, any>>} */
    inviteNominee: async (values) => (await request('POST', '/api/nominees', values)).nominee,
    /**
     * accept / decline (as the nominee) or revoke / reinvite (as the owner).
     * @param {string} id @param {'accept' | 'decline' | 'revoke' | 'reinvite'} action
     */
    updateNominee: async (id, action) => request('PATCH', `/api/nominees/${encodeURIComponent(id)}`, { action }),
    /** Where I'm the nominee (owner's name only). @returns {Promise<Record<string, any>[]>} */
    listNominations: async () => (await request('GET', '/api/nominations')).nominations,
  }
}

/** @typedef {ReturnType<typeof createApi>} Api */
