import request from 'supertest'
import { createApp } from '../app.js'
import { createFakeSupabase } from '../test-utils/fakeSupabase.js'

// Cast: Mmabatho (deceased, verified), Jabu (alive, no report), Sipho (nominee
// of both), Lerato (stranger), Naledi (the families' broker).
const sipho = { token: 't-sipho', id: 'u-sipho', email: 'sipho@lefa.test', full_name: 'Sipho Ndlovu', role: /** @type {const} */ ('member') }
const lerato = { token: 't-lerato', id: 'u-lerato', email: 'lerato@lefa.test', full_name: 'Lerato Mokoena', role: /** @type {const} */ ('member') }
const naledi = { token: 't-naledi', id: 'u-naledi', email: 'broker@lefa.test', full_name: 'Naledi Dube', role: /** @type {const} */ ('broker') }
const mmabatho = { token: 't-mma', id: '00000000-0000-4000-8000-0000000000a1', email: 'mma@lefa.test', full_name: 'Mmabatho Ndlovu', phone: '+27820000006', role: /** @type {const} */ ('member') }
const jabu = { token: 't-jabu', id: '00000000-0000-4000-8000-0000000000a2', email: 'jabu@lefa.test', full_name: 'Jabulani Khumalo', role: /** @type {const} */ ('member') }

const PDF = Buffer.concat([Buffer.from('%PDF-1.7\n'), Buffer.alloc(300, 32)])
const EXE = Buffer.concat([Buffer.from('MZ'), Buffer.alloc(100)])
const today = new Date().toISOString().slice(0, 10)

function setup() {
  const supabase = createFakeSupabase({
    users: [sipho, lerato, naledi, mmabatho, jabu],
    policies: [
      { id: 'p-avbob', owner_id: mmabatho.id, insurer: 'AVBOB', policy_number: 'AV-1', cover_amount: 15000, status: 'active' },
      { id: 'p-assupol', owner_id: mmabatho.id, insurer: 'Assupol', policy_number: 'AS-1', cover_amount: 20000, status: 'active' },
      { id: 'p-lapsed', owner_id: mmabatho.id, insurer: 'Clientele', policy_number: 'CL-1', cover_amount: 5000, status: 'lapsed' },
      { id: 'p-jabu', owner_id: jabu.id, insurer: 'Sanlam', policy_number: 'SL-1', cover_amount: 60000, status: 'active' },
    ],
    documents: [
      { id: '00000000-0000-4000-8000-00000000d0c1', owner_id: mmabatho.id, doc_type: 'certified_id', file_name: 'id.pdf', storage_path: `${mmabatho.id}/id.pdf`, mime_type: 'application/pdf', size_bytes: 300 },
    ],
    files: { [`${mmabatho.id}/id.pdf`]: PDF },
    nominees: [
      { owner_id: mmabatho.id, nominee_email: sipho.email, nominee_id: sipho.id, relationship: 'other', status: 'accepted' },
      { owner_id: jabu.id, nominee_email: sipho.email, nominee_id: sipho.id, relationship: 'parent', status: 'accepted' },
    ],
    deathReports: [
      { id: 'r-mma', owner_id: mmabatho.id, reported_by: sipho.id, date_of_death: '2026-11-12', certificate_path: `${mmabatho.id}/cert.pdf`, status: 'verified', reviewed_at: '2026-11-13T09:00:00Z' },
    ],
    claims: [
      { id: '00000000-0000-4000-8000-00000000c001', policy_id: 'p-avbob', death_report_id: 'r-mma', status: 'submitted' },
      { id: '00000000-0000-4000-8000-00000000c002', policy_id: 'p-assupol', death_report_id: 'r-mma', status: 'not_started' },
    ],
    claimEvents: [
      { claim_id: '00000000-0000-4000-8000-00000000c001', from_status: null, to_status: 'not_started', note: 'Claim opened', created_at: '2026-11-13T09:00:00Z' },
      { claim_id: '00000000-0000-4000-8000-00000000c001', from_status: 'not_started', to_status: 'submitted', note: 'At the branch', created_at: '2026-11-14T09:00:00Z' },
    ],
    brokerClients: [
      { broker_id: naledi.id, client_id: mmabatho.id },
      { broker_id: naledi.id, client_id: jabu.id },
    ],
  })
  const app = createApp({ supabase, logger: { error: jest.fn() } })
  const as = (/** @type {{ token: string }} */ u) => ({
    get: (/** @type {string} */ url) => request(app).get(url).set('Authorization', `Bearer ${u.token}`),
    post: (/** @type {string} */ url) => request(app).post(url).set('Authorization', `Bearer ${u.token}`),
    patch: (/** @type {string} */ url) => request(app).patch(url).set('Authorization', `Bearer ${u.token}`),
  })
  return { supabase, app, as }
}

/** @param {ReturnType<typeof setup>} ctx @param {{ token: string }} user */
const report = (ctx, user, { owner = jabu.id, date = today, file = PDF, name = 'certificate.pdf' } = {}) => {
  const req = ctx.as(user).post('/api/death-reports').field('owner_id', owner).field('date_of_death', date).field('dha_reference', 'BI-1663 1234')
  return file ? req.attach('certificate', file, name) : req
}

describe('GET /api/nominations: vault state per person', () => {
  test('Mmabatho is unlocked with her claim count; Jabulani is locked', async () => {
    const res = await setup().as(sipho).get('/api/nominations')
    const byName = Object.fromEntries(res.body.nominations.map((/** @type {any} */ n) => [n.owner_name, n]))
    expect(byName['Mmabatho Ndlovu'].vault).toEqual({ state: 'unlocked', report_status: 'verified', rejection_reason: null })
    expect(byName['Jabulani Khumalo'].vault).toEqual({ state: 'locked', report_status: null, rejection_reason: null })
  })
})

describe('POST /api/death-reports', () => {
  test('the nominee reports a death with the certificate: pending, stored in the deceased’s folder', async () => {
    const ctx = setup()
    const res = await report(ctx, sipho)
    expect(res.status).toBe(201)
    expect(res.body.report).toMatchObject({ owner_id: jabu.id, reported_by: sipho.id, status: 'pending', date_of_death: today, dha_reference: 'BI-1663 1234' })
    expect(res.body.report.certificate_path).toMatch(new RegExp(`^${jabu.id}/[0-9a-f-]{36}-certificate\\.pdf$`))
    expect(ctx.supabase.certificates.size).toBe(1)
    const after = await ctx.as(sipho).get('/api/nominations')
    expect(after.body.nominations.find((/** @type {any} */ n) => n.owner_id === jabu.id).vault.state).toBe('under_review')
  })

  test('a stranger cannot report (403) and nothing is stored', async () => {
    const ctx = setup()
    const res = await report(ctx, lerato)
    expect(res.status).toBe(403)
    expect(ctx.supabase.certificates.size).toBe(0)
  })

  test('validates the date, the certificate and its real type', async () => {
    expect((await report(setup(), sipho, { date: '2999-01-01' })).body.error.fields.date_of_death).toMatch(/future/)
    expect((await report(setup(), sipho, { file: null })).body.error.fields.certificate).toMatch(/certificate/)
    expect((await report(setup(), sipho, { file: EXE, name: 'cert.pdf' })).status).toBe(415)
  })

  test('only one open report per person (409), and no orphan file', async () => {
    const ctx = setup()
    const res = await report(ctx, sipho, { owner: mmabatho.id })
    expect(res.status).toBe(409)
    expect(res.body.error.code).toBe('report_exists')
    expect(ctx.supabase.certificates.size).toBe(0)
  })
})

describe('GET /api/vaults/:ownerId (unlocked vault)', () => {
  test('after a verified death the nominee gets the whole vault: policies, documents, claims with history', async () => {
    const res = await setup().as(sipho).get(`/api/vaults/${mmabatho.id}`)
    expect(res.status).toBe(200)
    const { vault } = res.body
    expect(vault.owner).toEqual({ id: mmabatho.id, full_name: 'Mmabatho Ndlovu' })
    expect(vault.report).toMatchObject({ status: 'verified', date_of_death: '2026-11-12' })
    expect(vault.policies.map((/** @type {any} */ p) => p.insurer).sort()).toEqual(['AVBOB', 'Assupol', 'Clientele'])
    expect(vault.documents).toHaveLength(1)
    const avbob = vault.claims.find((/** @type {any} */ c) => c.policy_id === 'p-avbob')
    expect(avbob.status).toBe('submitted')
    expect(avbob.events.map((/** @type {any} */ e) => e.to_status)).toEqual(['not_started', 'submitted'])
    expect(JSON.stringify(vault)).not.toContain('+27820000006') // still no phone number
  })

  test('before verification the vault is locked (403 vault_locked)', async () => {
    const res = await setup().as(sipho).get(`/api/vaults/${jabu.id}`)
    expect(res.status).toBe(403)
    expect(res.body.error.code).toBe('vault_locked')
  })

  test('a stranger gets 403 too, and a malformed id 404', async () => {
    expect((await setup().as(lerato).get(`/api/vaults/${mmabatho.id}`)).status).toBe(403)
    expect((await setup().as(sipho).get('/api/vaults/nope')).status).toBe(404)
  })

  test('the nominee can open the deceased’s documents with a 60-second link', async () => {
    const ctx = setup()
    const ok = await ctx.as(sipho).get(`/api/vaults/${mmabatho.id}/documents/00000000-0000-4000-8000-00000000d0c1/url`)
    expect(ok.status).toBe(200)
    expect(ok.body.expires_in).toBe(60)
    expect((await ctx.as(lerato).get(`/api/vaults/${mmabatho.id}/documents/00000000-0000-4000-8000-00000000d0c1/url`)).status).toBe(404)
  })
})

describe('PATCH /api/claims/:id', () => {
  const AVBOB = '/api/claims/00000000-0000-4000-8000-00000000c001'

  test('the unlocked nominee moves a claim forward with a note; it is logged', async () => {
    const ctx = setup()
    const res = await ctx.as(sipho).patch(AVBOB).send({ status: 'documents_requested', note: 'AVBOB wants a bank letter' })
    expect(res.status).toBe(200)
    expect(res.body.claim).toEqual({ id: '00000000-0000-4000-8000-00000000c001', status: 'documents_requested' })
    expect(ctx.supabase.tables.claim_events.at(-1)).toMatchObject({ from_status: 'submitted', to_status: 'documents_requested', note: 'AVBOB wants a bank letter', actor_id: 'u-sipho' })
  })

  test('the same status again is 409; an unknown status is 400', async () => {
    expect((await setup().as(sipho).patch(AVBOB).send({ status: 'submitted' })).status).toBe(409)
    expect((await setup().as(sipho).patch(AVBOB).send({ status: 'teleported' })).status).toBe(400)
  })

  test('a stranger cannot update a claim (403)', async () => {
    expect((await setup().as(lerato).patch(AVBOB).send({ status: 'paid' })).status).toBe(403)
  })
})
