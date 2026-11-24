import request from 'supertest'
import { createApp } from '../app.js'
import { createFakeSupabase } from '../test-utils/fakeSupabase.js'

const thandi = { token: 't-thandi', id: 'u-thandi', email: 'thandi@lefa.test', full_name: 'Thandi Mokoena', phone: '+27820000001', role: /** @type {const} */ ('member') }
const lerato = { token: 't-lerato', id: 'u-lerato', email: 'lerato@lefa.test', full_name: 'Lerato Mokoena', role: /** @type {const} */ ('member') }
const sipho = { token: 't-sipho', id: 'u-sipho', email: 'sipho@lefa.test', full_name: 'Sipho Ndlovu', role: /** @type {const} */ ('member') }
const naledi = { token: 't-naledi', id: 'u-naledi', email: 'broker@lefa.test', full_name: 'Naledi Dube', role: /** @type {const} */ ('broker') }

/** @param {Parameters<typeof createFakeSupabase>[0]} [extra] */
function setup(extra = {}) {
  const supabase = createFakeSupabase({ users: [thandi, lerato, sipho, naledi], ...extra })
  const app = createApp({ supabase, logger: { error: jest.fn() } })
  const as = (/** @type {{ token: string }} */ u) => ({
    get: (/** @type {string} */ url) => request(app).get(url).set('Authorization', `Bearer ${u.token}`),
    post: (/** @type {string} */ url) => request(app).post(url).set('Authorization', `Bearer ${u.token}`),
    patch: (/** @type {string} */ url) => request(app).patch(url).set('Authorization', `Bearer ${u.token}`),
  })
  return { supabase, app, as }
}

/** Thandi has invited Lerato. */
const invited = (status = 'invited', nominee_id = /** @type {string | null} */ (null)) =>
  setup({ nominees: [{ id: '00000000-0000-4000-8000-00000000aaaa', owner_id: 'u-thandi', nominee_email: 'lerato@lefa.test', relationship: 'child', status, nominee_id }] })
const NOM = '/api/nominees/00000000-0000-4000-8000-00000000aaaa'

describe('POST /api/nominees (invite)', () => {
  test('invites by email (normalised) with a relationship (201)', async () => {
    const res = await setup().as(thandi).post('/api/nominees').send({ email: '  Lerato@Lefa.TEST ', relationship: 'child' })
    expect(res.status).toBe(201)
    expect(res.body.nominee).toMatchObject({ owner_id: 'u-thandi', nominee_email: 'lerato@lefa.test', relationship: 'child', status: 'invited', nominee_id: null })
  })

  test('validates email and relationship (400)', async () => {
    const res = await setup().as(thandi).post('/api/nominees').send({ email: 'not-an-email', relationship: 'cousin' })
    expect(res.status).toBe(400)
    expect(Object.keys(res.body.error.fields).sort()).toEqual(['email', 'relationship'])
  })

  test('you cannot nominate yourself (400)', async () => {
    const res = await setup().as(thandi).post('/api/nominees').send({ email: 'thandi@lefa.test', relationship: 'other' })
    expect(res.status).toBe(400)
    expect(res.body.error.fields.email).toMatch(/yourself/)
  })

  test('the same person twice is 409', async () => {
    const res = await invited().as(thandi).post('/api/nominees').send({ email: 'lerato@lefa.test', relationship: 'child' })
    expect(res.status).toBe(409)
    expect(res.body.error.code).toBe('duplicate_nominee')
  })

  test('at most 3 active nominees (422)', async () => {
    const ctx = setup()
    for (const e of ['a@x.co', 'b@x.co', 'c@x.co']) await ctx.as(thandi).post('/api/nominees').send({ email: e, relationship: 'other' })
    const res = await ctx.as(thandi).post('/api/nominees').send({ email: 'd@x.co', relationship: 'other' })
    expect(res.status).toBe(422)
    expect(res.body.error.code).toBe('nominee_limit')
  })

  test('brokers have no vault to nominate for (403)', async () => {
    expect((await setup().as(naledi).post('/api/nominees').send({ email: 'x@x.co', relationship: 'other' })).status).toBe(403)
  })
})

describe('GET /api/nominees', () => {
  test('lists the owner’s nominees only', async () => {
    const ctx = invited()
    expect((await ctx.as(thandi).get('/api/nominees')).body.nominees).toHaveLength(1)
    expect((await ctx.as(sipho).get('/api/nominees')).body.nominees).toEqual([])
  })
})

describe('GET /api/nominations (nominated for me)', () => {
  test('shows the invitation with only the owner’s name: no phone, email or vault details', async () => {
    const res = await invited().as(lerato).get('/api/nominations')
    expect(res.status).toBe(200)
    expect(res.body.nominations).toEqual([
      {
        id: '00000000-0000-4000-8000-00000000aaaa',
        owner_id: 'u-thandi',
        owner_name: 'Thandi Mokoena',
        relationship: 'child',
        status: 'invited',
        created_at: expect.any(String),
      },
    ])
    expect(JSON.stringify(res.body)).not.toMatch(/\+2782|thandi@/)
  })

  test('a stranger has none', async () => {
    expect((await invited().as(sipho).get('/api/nominations')).body.nominations).toEqual([])
  })
})

describe('PATCH /api/nominees/:id', () => {
  test('the nominee accepts: status accepted and linked to their account', async () => {
    const ctx = invited()
    const res = await ctx.as(lerato).patch(NOM).send({ action: 'accept' })
    expect(res.status).toBe(200)
    expect(res.body.nomination).toEqual({ id: '00000000-0000-4000-8000-00000000aaaa', status: 'accepted' })
    expect(ctx.supabase.tables.nominees[0]).toMatchObject({ status: 'accepted', nominee_id: 'u-lerato' })
  })

  test('the nominee can decline', async () => {
    const ctx = invited()
    expect((await ctx.as(lerato).patch(NOM).send({ action: 'decline' })).status).toBe(200)
    expect(ctx.supabase.tables.nominees[0].status).toBe('declined')
  })

  test('the owner cannot accept on the nominee’s behalf (403)', async () => {
    const res = await invited().as(thandi).patch(NOM).send({ action: 'accept' })
    expect(res.status).toBe(403)
  })

  test('the owner can revoke, and re-invite later', async () => {
    const ctx = invited('accepted', 'u-lerato')
    expect((await ctx.as(thandi).patch(NOM).send({ action: 'revoke' })).body.nominee.status).toBe('revoked')
    expect((await ctx.as(thandi).patch(NOM).send({ action: 'reinvite' })).body.nominee.status).toBe('invited')
  })

  test('the nominee cannot revoke (403) and a revoked invitation cannot be accepted (409)', async () => {
    expect((await invited().as(lerato).patch(NOM).send({ action: 'revoke' })).status).toBe(403)
    const res = await invited('revoked').as(lerato).patch(NOM).send({ action: 'accept' })
    expect(res.status).toBe(404) // revoked invitations are no longer shown to the nominee
  })

  test('accepting twice is a 409', async () => {
    const res = await invited('accepted', 'u-lerato').as(lerato).patch(NOM).send({ action: 'accept' })
    expect(res.status).toBe(409)
    expect(res.body.error.code).toBe('invalid_transition')
  })

  test('a stranger gets 404; an unknown action is 400', async () => {
    expect((await invited().as(sipho).patch(NOM).send({ action: 'accept' })).status).toBe(404)
    expect((await invited().as(lerato).patch(NOM).send({ action: 'promote' })).status).toBe(400)
  })
})
