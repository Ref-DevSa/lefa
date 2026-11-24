import request from 'supertest'
import { createApp } from '../app.js'
import { createFakeSupabase } from '../test-utils/fakeSupabase.js'

// Naledi is the broker for Mmabatho (deceased, verified) and Jabulani (death
// reported, pending). Bheki is a broker for nobody here. Sipho reported both.
const naledi = { token: 't-naledi', id: 'u-naledi', email: 'broker@lefa.test', full_name: 'Naledi Dube', role: /** @type {const} */ ('broker') }
const bheki = { token: 't-bheki', id: 'u-bheki', email: 'bheki@lefa.test', full_name: 'Bheki Zulu', role: /** @type {const} */ ('broker') }
const sipho = { token: 't-sipho', id: 'u-sipho', email: 'sipho@lefa.test', full_name: 'Sipho Ndlovu', phone: '+27820000003', role: /** @type {const} */ ('member') }
const MMA = '00000000-0000-4000-8000-0000000000a1'
const JABU = '00000000-0000-4000-8000-0000000000a2'
const mmabatho = { token: 't-mma', id: MMA, email: 'mma@lefa.test', full_name: 'Mmabatho Ndlovu', role: /** @type {const} */ ('member') }
const jabu = { token: 't-jabu', id: JABU, email: 'jabu@lefa.test', full_name: 'Jabulani Khumalo', phone: '+27820000007', role: /** @type {const} */ ('member') }
const R_JABU = '00000000-0000-4000-8000-00000000d0a2'
const R_MMA = '00000000-0000-4000-8000-00000000d0a1'
const C_AVBOB = '00000000-0000-4000-8000-00000000c001'

function setup() {
  const supabase = createFakeSupabase({
    users: [naledi, bheki, sipho, mmabatho, jabu],
    brokerClients: [
      { broker_id: naledi.id, client_id: MMA },
      { broker_id: naledi.id, client_id: JABU },
    ],
    nominees: [
      { owner_id: MMA, nominee_email: sipho.email, nominee_id: sipho.id, relationship: 'other', status: 'accepted' },
      { owner_id: JABU, nominee_email: sipho.email, nominee_id: sipho.id, relationship: 'parent', status: 'accepted' },
    ],
    policies: [
      { id: 'p-avbob', owner_id: MMA, insurer: 'AVBOB', policy_number: 'AV-1', cover_amount: 15000, status: 'active' },
      { id: 'p-assupol', owner_id: MMA, insurer: 'Assupol', policy_number: 'AS-1', cover_amount: 20000, status: 'active' },
      { id: 'p-sanlam', owner_id: JABU, insurer: 'Sanlam', policy_number: 'SL-1', cover_amount: 60000, status: 'active' },
      { id: 'p-lapsed', owner_id: JABU, insurer: 'Clientele', policy_number: 'CL-1', cover_amount: 8000, status: 'lapsed' },
    ],
    deathReports: [
      { id: R_MMA, owner_id: MMA, reported_by: sipho.id, date_of_death: '2026-11-12', certificate_path: `${MMA}/cert.pdf`, status: 'verified', created_at: '2026-11-12T10:00:00Z' },
      { id: R_JABU, owner_id: JABU, reported_by: sipho.id, date_of_death: '2026-11-21', certificate_path: `${JABU}/cert.pdf`, dha_reference: 'BI-1663 0457731', notes: 'He passed at home', created_at: '2026-11-22T10:00:00Z' },
    ],
    certificates: { [`${JABU}/cert.pdf`]: Buffer.from('%PDF-1.4') },
    claims: [
      { id: C_AVBOB, policy_id: 'p-avbob', death_report_id: R_MMA, status: 'paid', created_at: '2026-11-13T10:00:00Z' },
      { id: '00000000-0000-4000-8000-00000000c002', policy_id: 'p-assupol', death_report_id: R_MMA, status: 'submitted', created_at: '2026-11-13T10:00:00Z' },
    ],
    claimEvents: [
      { claim_id: C_AVBOB, from_status: null, to_status: 'not_started', note: 'Claim opened', created_at: '2026-11-13T10:00:00Z' },
      { claim_id: C_AVBOB, from_status: 'approved', to_status: 'paid', note: "R15 000 paid", created_at: new Date().toISOString() },
    ],
  })
  const app = createApp({ supabase, logger: { error: jest.fn() } })
  const as = (/** @type {{ token: string }} */ u) => ({
    get: (/** @type {string} */ url) => request(app).get(url).set('Authorization', `Bearer ${u.token}`),
    post: (/** @type {string} */ url) => request(app).post(url).set('Authorization', `Bearer ${u.token}`),
  })
  return { supabase, as }
}

describe('who may use the broker API', () => {
  test.each([
    ['get', '/api/broker/overview'],
    ['get', '/api/broker/reports'],
    ['get', `/api/broker/reports/${R_JABU}`],
    ['post', `/api/broker/reports/${R_JABU}/verify`],
    ['post', `/api/broker/reports/${R_JABU}/reject`],
    ['get', '/api/broker/claims'],
  ])('a member gets 403 on %s %s', async (method, url) => {
    const res = await /** @type {any} */ (setup().as(sipho))[method](url)
    expect(res.status).toBe(403)
  })
})

describe('GET /api/broker/overview', () => {
  test('counts clients, pending reports, open claims and what was paid this month', async () => {
    const res = await setup().as(naledi).get('/api/broker/overview')
    expect(res.status).toBe(200)
    expect(res.body.overview).toEqual({ clients: 2, pending_reports: 1, open_claims: 1, paid_this_month: 15000 })
    expect(res.body.activity[0]).toMatchObject({ insurer: 'AVBOB', owner_name: 'Mmabatho Ndlovu', to_status: 'paid', note: 'R15 000 paid' })
  })

  test('another broker sees zeros', async () => {
    const res = await setup().as(bheki).get('/api/broker/overview')
    expect(res.body.overview).toEqual({ clients: 0, pending_reports: 0, open_claims: 0, paid_this_month: 0 })
  })
})

describe('death report queue and details', () => {
  test('pending reports with the deceased, the reporter and their relationship', async () => {
    const res = await setup().as(naledi).get('/api/broker/reports')
    expect(res.body.reports).toEqual([
      expect.objectContaining({ id: R_JABU, owner_name: 'Jabulani Khumalo', reporter_name: 'Sipho Ndlovu', relationship: 'parent', date_of_death: '2026-11-21', status: 'pending' }),
    ])
  })

  test('details include a 60-second certificate link and which policies will become claims', async () => {
    const res = await setup().as(naledi).get(`/api/broker/reports/${R_JABU}`)
    expect(res.status).toBe(200)
    const { report } = res.body
    expect(report.owner).toEqual({ id: JABU, full_name: 'Jabulani Khumalo', phone: '+27820000007' })
    expect(report.reporter).toEqual({ id: sipho.id, full_name: 'Sipho Ndlovu', relationship: 'parent' })
    expect(report.certificate).toEqual({ url: expect.stringContaining('expires=60'), kind: 'pdf' })
    expect(report.policies.map((/** @type {any} */ p) => [p.insurer, p.will_claim])).toEqual([
      ['Sanlam', true],
      ['Clientele', false],
    ])
    expect(report).toMatchObject({ dha_reference: 'BI-1663 0457731', notes: 'He passed at home' })
  })

  test('another broker cannot see the report (404)', async () => {
    expect((await setup().as(bheki).get(`/api/broker/reports/${R_JABU}`)).status).toBe(404)
  })
})

describe('verify and reject', () => {
  test('verifying unlocks the vault and creates claims (lapsed policy skipped)', async () => {
    const ctx = setup()
    const res = await ctx.as(naledi).post(`/api/broker/reports/${R_JABU}/verify`)
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ report: { id: R_JABU, status: 'verified' }, claims_created: 1 })
    const vault = await ctx.as(sipho).get(`/api/vaults/${JABU}`)
    expect(vault.status).toBe(200)
  })

  test('another broker cannot verify (403); verifying twice is 409', async () => {
    const ctx = setup()
    expect((await ctx.as(bheki).post(`/api/broker/reports/${R_JABU}/verify`)).status).toBe(403)
    expect((await ctx.as(naledi).post(`/api/broker/reports/${R_MMA}/verify`)).status).toBe(409)
  })

  test('rejecting needs a reason, and the nominee then sees it', async () => {
    const ctx = setup()
    const noReason = await ctx.as(naledi).post(`/api/broker/reports/${R_JABU}/reject`).send({ reason: ' ' })
    expect(noReason.status).toBe(400)
    const res = await ctx.as(naledi).post(`/api/broker/reports/${R_JABU}/reject`).send({ reason: 'The certificate is not readable' })
    expect(res.body).toEqual({ report: { id: R_JABU, status: 'rejected' } })
    const n = await ctx.as(sipho).get('/api/nominations')
    expect(n.body.nominations.find((/** @type {any} */ x) => x.owner_id === JABU).vault).toEqual({
      state: 'rejected',
      report_status: 'rejected',
      rejection_reason: 'The certificate is not readable',
    })
  })
})

describe('GET /api/broker/claims (pipeline)', () => {
  test('lists the broker’s claims with client name, insurer and cover', async () => {
    const res = await setup().as(naledi).get('/api/broker/claims')
    expect(res.body.claims.map((/** @type {any} */ c) => [c.owner_name, c.insurer, c.cover_amount, c.status]).sort()).toEqual([
      ['Mmabatho Ndlovu', 'AVBOB', 15000, 'paid'],
      ['Mmabatho Ndlovu', 'Assupol', 20000, 'submitted'],
    ])
  })

  test('a claim’s timeline', async () => {
    const res = await setup().as(naledi).get(`/api/broker/claims/${C_AVBOB}/events`)
    expect(res.body.events.map((/** @type {any} */ e) => e.to_status)).toEqual(['not_started', 'paid'])
  })

  test('another broker sees no claims', async () => {
    expect((await setup().as(bheki).get('/api/broker/claims')).body.claims).toEqual([])
  })
})
