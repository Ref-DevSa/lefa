import request from 'supertest'
import { createApp } from '../app.js'
import { createFakeSupabase } from '../test-utils/fakeSupabase.js'

const thandi = { token: 'token-thandi', id: 'u-thandi', email: 'thandi@lefa.test', full_name: 'Thandi Mokoena', role: /** @type {const} */ ('member') }
const lerato = { token: 'token-lerato', id: 'u-lerato', email: 'lerato@lefa.test', full_name: 'Lerato Mokoena', role: /** @type {const} */ ('member') }
const naledi = { token: 'token-naledi', id: 'u-naledi', email: 'naledi@lefa.test', full_name: 'Naledi Dube', role: /** @type {const} */ ('broker') }

const thandisPolicies = [
  { owner_id: 'u-thandi', insurer: 'Old Mutual', policy_number: 'OM-4821', type: 'funeral', cover_amount: 30000, monthly_premium: 199, debit_day: 25, status: 'active', created_at: '2026-11-20T10:00:00Z' },
  { owner_id: 'u-thandi', insurer: 'Sanlam', policy_number: 'SL-1002', type: 'life', cover_amount: 55000, monthly_premium: 288.5, debit_day: 1, status: 'active', created_at: '2026-11-21T10:00:00Z' },
  { owner_id: 'u-thandi', insurer: 'Clientele', policy_number: 'CL-77', type: 'funeral', cover_amount: 10000, monthly_premium: 99, status: 'lapsed', created_at: '2026-11-22T10:00:00Z' },
]

const valid = {
  insurer: 'Hollard',
  policy_number: 'HL-555',
  type: 'credit_life',
  cover_amount: 15000,
  monthly_premium: 75.25,
  debit_day: 15,
  status: 'active',
  beneficiaries: 'Lerato (daughter)',
  notes: '',
}

function setup() {
  const supabase = createFakeSupabase({ users: [thandi, lerato, naledi], policies: thandisPolicies })
  const app = createApp({ supabase, logger: { error: jest.fn() } })
  /** @param {{ token: string }} user */
  const as = (user) => ({
    get: (/** @type {string} */ url) => request(app).get(url).set('Authorization', `Bearer ${user.token}`),
    post: (/** @type {string} */ url) => request(app).post(url).set('Authorization', `Bearer ${user.token}`),
    patch: (/** @type {string} */ url) => request(app).patch(url).set('Authorization', `Bearer ${user.token}`),
    delete: (/** @type {string} */ url) => request(app).delete(url).set('Authorization', `Bearer ${user.token}`),
  })
  return { app, supabase, as }
}

describe('access', () => {
  test.each([
    ['get', '/api/policies'],
    ['post', '/api/policies'],
    ['patch', '/api/policies/00000000-0000-4000-8000-000000000001'],
    ['delete', '/api/policies/00000000-0000-4000-8000-000000000001'],
    ['get', '/api/vault/summary'],
  ])('%s %s needs a login (401)', async (method, url) => {
    const res = await /** @type {any} */ (request(setup().app))[method](url)
    expect(res.status).toBe(401)
  })

  test('brokers do not have a vault (403)', async () => {
    const res = await setup().as(naledi).get('/api/policies')
    expect(res.status).toBe(403)
    expect(res.body.error.code).toBe('forbidden')
  })
})

describe('GET /api/policies', () => {
  test('returns the member’s own policies, newest first', async () => {
    const res = await setup().as(thandi).get('/api/policies')
    expect(res.status).toBe(200)
    expect(res.body.policies.map((/** @type {any} */ p) => p.policy_number)).toEqual(['CL-77', 'SL-1002', 'OM-4821'])
  })

  test('another member sees 0 of Thandi’s policies', async () => {
    const res = await setup().as(lerato).get('/api/policies')
    expect(res.status).toBe(200)
    expect(res.body.policies).toEqual([])
  })
})

describe('POST /api/policies', () => {
  test('creates a policy in the caller’s vault (201)', async () => {
    const { as, supabase } = setup()
    const res = await as(lerato).post('/api/policies').send(valid)
    expect(res.status).toBe(201)
    expect(res.body.policy).toMatchObject({ ...valid, owner_id: 'u-lerato' })
    expect(supabase.tables.policies.filter((p) => p.owner_id === 'u-lerato')).toHaveLength(1)
  })

  test('only insurer and policy number are required; the rest gets sensible defaults', async () => {
    const res = await setup().as(lerato).post('/api/policies').send({ insurer: ' AVBOB ', policy_number: ' AV-1 ' })
    expect(res.status).toBe(201)
    expect(res.body.policy).toMatchObject({ insurer: 'AVBOB', policy_number: 'AV-1', type: 'funeral', status: 'active', cover_amount: 0 })
  })

  test('returns field-level messages for invalid input (400)', async () => {
    const res = await setup()
      .as(lerato)
      .post('/api/policies')
      .send({ insurer: '', policy_number: '', cover_amount: -1, monthly_premium: 10.555, debit_day: 32, type: 'car' })
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('validation_failed')
    expect(res.body.error.fields).toEqual({
      insurer: 'Insurer is required.',
      policy_number: 'Policy number is required.',
      cover_amount: 'Cover amount must be R0 or more.',
      monthly_premium: 'Use at most 2 decimal places (cents).',
      debit_day: 'Debit day must be between 1 and 31.',
      type: 'Choose funeral, life, credit life or other.',
    })
  })

  test('cannot choose the owner: owner_id in the body is rejected', async () => {
    const res = await setup().as(lerato).post('/api/policies').send({ ...valid, owner_id: 'u-thandi' })
    expect(res.status).toBe(400)
    expect(res.body.error.message).toMatch(/owner_id/)
  })

  test('the same policy twice returns 409', async () => {
    const res = await setup().as(thandi).post('/api/policies').send({ insurer: 'Old Mutual', policy_number: 'OM-4821' })
    expect(res.status).toBe(409)
    expect(res.body.error.code).toBe('duplicate_policy')
  })
})

describe('PATCH /api/policies/:id', () => {
  /** @param {ReturnType<typeof setup>} ctx */
  const idOf = (ctx, number = 'OM-4821') => ctx.supabase.tables.policies.find((p) => p.policy_number === number)?.id

  test('updates only the fields sent', async () => {
    const ctx = setup()
    const res = await ctx.as(thandi).patch(`/api/policies/${idOf(ctx)}`).send({ status: 'lapsed', monthly_premium: 210 })
    expect(res.status).toBe(200)
    expect(res.body.policy).toMatchObject({ insurer: 'Old Mutual', status: 'lapsed', monthly_premium: 210 })
  })

  test('another member gets 404 (not 403), so they can’t even confirm it exists', async () => {
    const ctx = setup()
    const res = await ctx.as(lerato).patch(`/api/policies/${idOf(ctx)}`).send({ cover_amount: 1 })
    expect(res.status).toBe(404)
    expect(ctx.supabase.tables.policies.find((p) => p.policy_number === 'OM-4821')?.cover_amount).toBe(30000)
  })

  test('an empty update is rejected (400)', async () => {
    const ctx = setup()
    const res = await ctx.as(thandi).patch(`/api/policies/${idOf(ctx)}`).send({})
    expect(res.status).toBe(400)
  })

  test('a malformed id returns 404 rather than a server error', async () => {
    const res = await setup().as(thandi).patch('/api/policies/not-a-uuid').send({ notes: 'x' })
    expect(res.status).toBe(404)
  })
})

describe('DELETE /api/policies/:id', () => {
  test('the owner can delete (204)', async () => {
    const ctx = setup()
    const id = ctx.supabase.tables.policies.find((p) => p.policy_number === 'CL-77')?.id
    const res = await ctx.as(thandi).delete(`/api/policies/${id}`)
    expect(res.status).toBe(204)
    expect(ctx.supabase.tables.policies).toHaveLength(2)
  })

  test('another member gets 404 and nothing is deleted', async () => {
    const ctx = setup()
    const id = ctx.supabase.tables.policies.find((p) => p.policy_number === 'CL-77')?.id
    const res = await ctx.as(lerato).delete(`/api/policies/${id}`)
    expect(res.status).toBe(404)
    expect(ctx.supabase.tables.policies).toHaveLength(3)
  })
})

describe('GET /api/vault/summary', () => {
  test('totals count active policies only, in exact cents', async () => {
    const res = await setup().as(thandi).get('/api/vault/summary')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({
      summary: {
        policy_count: 3,
        active_count: 2,
        total_active_cover: 85000,
        monthly_premiums: 487.5,
        insurer_count: 2,
      },
    })
  })

  test('an empty vault returns zeros', async () => {
    const res = await setup().as(lerato).get('/api/vault/summary')
    expect(res.body.summary).toEqual({ policy_count: 0, active_count: 0, total_active_cover: 0, monthly_premiums: 0, insurer_count: 0 })
  })
})
