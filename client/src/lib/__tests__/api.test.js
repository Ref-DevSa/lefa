import { ApiError, createApi } from '../api.js'

/**
 * @param {number} status
 * @param {any} [body]
 */
const reply = (status, body) =>
  /** @type {Response} */ (/** @type {unknown} */ ({ ok: status >= 200 && status < 300, status, json: async () => body }))

function setup(/** @type {any} */ response, token = 'tok-1') {
  const fetchImpl = jest.fn(async () => (typeof response === 'function' ? response() : response))
  const onUnauthorized = jest.fn()
  const api = createApi({ baseUrl: 'https://api.test', getToken: async () => token, fetchImpl, onUnauthorized })
  return { api, fetchImpl, onUnauthorized }
}

test('sends the login token and returns the policies', async () => {
  const { api, fetchImpl } = setup(reply(200, { policies: [{ id: 'p1' }] }))
  await expect(api.listPolicies()).resolves.toEqual([{ id: 'p1' }])
  expect(fetchImpl).toHaveBeenCalledWith('https://api.test/api/policies', {
    method: 'GET',
    headers: { Authorization: 'Bearer tok-1' },
    body: undefined,
  })
})

test('sends JSON bodies for create and update', async () => {
  const { api, fetchImpl } = setup(reply(201, { policy: { id: 'p9' } }))
  await api.createPolicy({ insurer: 'AVBOB', policy_number: 'A1' })
  expect(fetchImpl).toHaveBeenCalledWith('https://api.test/api/policies', {
    method: 'POST',
    headers: { Authorization: 'Bearer tok-1', 'Content-Type': 'application/json' },
    body: JSON.stringify({ insurer: 'AVBOB', policy_number: 'A1' }),
  })
})

test('delete handles an empty 204 reply', async () => {
  const { api } = setup(reply(204))
  await expect(api.deletePolicy('p1')).resolves.toBeUndefined()
})

test('errors keep the API code, message and field messages', async () => {
  const { api } = setup(
    reply(400, { error: { code: 'validation_failed', message: 'Check the highlighted fields.', fields: { insurer: 'Insurer is required.' } } }),
  )
  const error = await api.createPolicy({}).catch((e) => e)
  expect(error).toBeInstanceOf(ApiError)
  expect(error).toMatchObject({ status: 400, code: 'validation_failed', fields: { insurer: 'Insurer is required.' } })
})

test('a 401 tells the app the login has expired', async () => {
  const { api, onUnauthorized } = setup(reply(401, { error: { code: 'unauthorized', message: 'Your session has expired. Log in again.' } }))
  await expect(api.getSummary()).rejects.toMatchObject({ status: 401 })
  expect(onUnauthorized).toHaveBeenCalled()
})

test('a network failure becomes a friendly error', async () => {
  const { api } = setup(() => {
    throw new TypeError('Failed to fetch')
  })
  await expect(api.listPolicies()).rejects.toMatchObject({ code: 'network_error', message: expect.stringMatching(/couldn't reach Lefa/) })
})

test('ids are URL-encoded', async () => {
  const { api, fetchImpl } = setup(reply(200, { policy: {} }))
  await api.getPolicy('a/b')
  expect(/** @type {any} */ (fetchImpl.mock.calls[0])[0]).toBe('https://api.test/api/policies/a%2Fb')
})
