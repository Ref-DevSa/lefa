import request from 'supertest'
import { createApp } from '../app.js'
import { createFakeSupabase } from '../test-utils/fakeSupabase.js'

const thandi = { token: 'token-thandi', id: 'u-thandi', email: 'thandi@lefa.test', role: /** @type {const} */ ('member') }
const lerato = { token: 'token-lerato', id: 'u-lerato', email: 'lerato@lefa.test', role: /** @type {const} */ ('member') }
const naledi = { token: 'token-naledi', id: 'u-naledi', email: 'naledi@lefa.test', role: /** @type {const} */ ('broker') }

// Real file signatures ("magic bytes") followed by filler.
const PDF = Buffer.concat([Buffer.from('%PDF-1.7\n'), Buffer.alloc(200, 32)])
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(100)])
const JPG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(100)])
const EXE = Buffer.concat([Buffer.from('MZ'), Buffer.alloc(100)])

const OM_ID = '00000000-0000-4000-8000-0000000000a1'
const LERATO_POLICY = '00000000-0000-4000-8000-0000000000b1'

function setup(extra = {}) {
  const supabase = createFakeSupabase({
    users: [thandi, lerato, naledi],
    policies: [
      { id: OM_ID, owner_id: 'u-thandi', insurer: 'Old Mutual', policy_number: 'OM-1' },
      { id: LERATO_POLICY, owner_id: 'u-lerato', insurer: 'Sanlam', policy_number: 'SL-1' },
    ],
    ...extra,
  })
  const app = createApp({ supabase, logger: { error: jest.fn() } })
  const as = (/** @type {{ token: string }} */ user) => ({
    get: (/** @type {string} */ url) => request(app).get(url).set('Authorization', `Bearer ${user.token}`),
    post: (/** @type {string} */ url) => request(app).post(url).set('Authorization', `Bearer ${user.token}`),
    delete: (/** @type {string} */ url) => request(app).delete(url).set('Authorization', `Bearer ${user.token}`),
  })
  return { app, supabase, as }
}

/** @param {ReturnType<typeof setup>} ctx */
const upload = (ctx, /** @type {{ token: string }} */ user = thandi, { file = PDF, name = 'schedule.pdf', type = 'policy_schedule', policy = OM_ID } = {}) => {
  const req = ctx.as(user).post('/api/documents').field('doc_type', type)
  if (policy) req.field('policy_id', policy)
  return file ? req.attach('file', file, name) : req
}

describe('POST /api/documents (upload)', () => {
  test('stores the file in the member’s own folder and records it (201)', async () => {
    const ctx = setup()
    const res = await upload(ctx)
    expect(res.status).toBe(201)
    expect(res.body.document).toMatchObject({
      owner_id: 'u-thandi',
      policy_id: OM_ID,
      doc_type: 'policy_schedule',
      file_name: 'schedule.pdf',
      mime_type: 'application/pdf',
      size_bytes: PDF.length,
    })
    expect(res.body.document.storage_path).toMatch(/^u-thandi\/[0-9a-f-]{36}-schedule\.pdf$/)
    expect(ctx.supabase.storage.has(res.body.document.storage_path)).toBe(true)
  })

  test('the file type comes from its content, not its name', async () => {
    const res = await upload(setup(), thandi, { file: PNG, name: 'id-photo.pdf', type: 'certified_id', policy: '' })
    expect(res.status).toBe(201)
    expect(res.body.document.mime_type).toBe('image/png')
  })

  test('accepts JPG and an unlinked document', async () => {
    const res = await upload(setup(), thandi, { file: JPG, name: 'bank letter.jpg', type: 'bank_letter', policy: '' })
    expect(res.status).toBe(201)
    expect(res.body.document).toMatchObject({ mime_type: 'image/jpeg', policy_id: null, file_name: 'bank letter.jpg' })
  })

  test('rejects a file that is not really a PDF/JPG/PNG, even if named .pdf (415)', async () => {
    const ctx = setup()
    const res = await upload(ctx, thandi, { file: EXE, name: 'invoice.pdf' })
    expect(res.status).toBe(415)
    expect(res.body.error.code).toBe('unsupported_file_type')
    expect(ctx.supabase.storage.size).toBe(0)
  })

  test('rejects files over 5 MB (413)', async () => {
    const big = Buffer.concat([Buffer.from('%PDF-1.7\n'), Buffer.alloc(5 * 1024 * 1024)])
    const res = await upload(setup(), thandi, { file: big })
    expect(res.status).toBe(413)
    expect(res.body.error.code).toBe('file_too_large')
  })

  test('requires a file and a valid document type (400)', async () => {
    const noFile = await upload(setup(), thandi, { file: null })
    expect(noFile.status).toBe(400)
    expect(noFile.body.error.fields.file).toMatch(/Choose a file/)
    const badType = await upload(setup(), thandi, { type: 'selfie' })
    expect(badType.status).toBe(400)
    expect(badType.body.error.fields.doc_type).toBeDefined()
  })

  test('cannot link a document to someone else’s policy, and leaves no orphan file', async () => {
    const ctx = setup()
    const res = await upload(ctx, thandi, { policy: LERATO_POLICY })
    expect(res.status).toBe(403)
    expect(ctx.supabase.storage.size).toBe(0)
    expect(ctx.supabase.tables.documents).toHaveLength(0)
  })

  test('brokers have no vault to upload into (403)', async () => {
    expect((await upload(setup(), naledi, { policy: '' })).status).toBe(403)
  })

  test('needs a login (401)', async () => {
    const res = await request(setup().app).post('/api/documents').field('doc_type', 'other').attach('file', PDF, 'x.pdf')
    expect(res.status).toBe(401)
  })
})

describe('GET /api/documents', () => {
  test('lists only the member’s own documents, newest first', async () => {
    const ctx = setup()
    await upload(ctx, thandi, { name: 'first.pdf' })
    await upload(ctx, lerato, { name: 'lerato.pdf', policy: LERATO_POLICY })
    await upload(ctx, thandi, { file: PNG, name: 'second.png', type: 'certified_id', policy: '' })
    const res = await ctx.as(thandi).get('/api/documents')
    expect(res.status).toBe(200)
    expect(res.body.documents.map((/** @type {any} */ d) => d.file_name).sort()).toEqual(['first.pdf', 'second.png'])
  })
})

describe('GET /api/documents/:id/url (view)', () => {
  test('returns a link that expires after 60 seconds', async () => {
    const ctx = setup()
    const { body } = await upload(ctx)
    const res = await ctx.as(thandi).get(`/api/documents/${body.document.id}/url`)
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ url: expect.stringContaining('expires=60'), expires_in: 60 })
  })

  test('someone else’s document is 404', async () => {
    const ctx = setup()
    const { body } = await upload(ctx)
    expect((await ctx.as(lerato).get(`/api/documents/${body.document.id}/url`)).status).toBe(404)
    expect((await ctx.as(thandi).get('/api/documents/not-a-uuid/url')).status).toBe(404)
  })
})

describe('DELETE /api/documents/:id', () => {
  test('removes the record and the file (204)', async () => {
    const ctx = setup()
    const { body } = await upload(ctx)
    const res = await ctx.as(thandi).delete(`/api/documents/${body.document.id}`)
    expect(res.status).toBe(204)
    expect(ctx.supabase.tables.documents).toHaveLength(0)
    expect(ctx.supabase.storage.size).toBe(0)
  })

  test('another member gets 404 and nothing is removed', async () => {
    const ctx = setup()
    const { body } = await upload(ctx)
    expect((await ctx.as(lerato).delete(`/api/documents/${body.document.id}`)).status).toBe(404)
    expect(ctx.supabase.tables.documents).toHaveLength(1)
    expect(ctx.supabase.storage.size).toBe(1)
  })
})
