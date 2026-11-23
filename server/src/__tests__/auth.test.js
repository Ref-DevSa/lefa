import express from 'express'
import request from 'supertest'
import { createApp } from '../app.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { errorHandler } from '../middleware/errors.js'
import { createFakeSupabase } from '../test-utils/fakeSupabase.js'

const thandi = { token: 'token-thandi', id: 'u-thandi', email: 'thandi@lefa.test', full_name: 'Thandi Mokoena', phone: '+27820000001', role: /** @type {const} */ ('member') }
const naledi = { token: 'token-naledi', id: 'u-naledi', email: 'naledi@lefa.test', full_name: 'Naledi Dube', role: /** @type {const} */ ('broker') }

const silent = { error: jest.fn() }

/** @param {Parameters<typeof createFakeSupabase>[0]} [options] */
function setup(options = { users: [thandi, naledi] }) {
  const supabase = createFakeSupabase(options)
  return { supabase, app: createApp({ supabase, logger: silent }) }
}

describe('GET /api/me', () => {
  test('401 without a token, in the standard error shape', async () => {
    const res = await request(setup().app).get('/api/me')
    expect(res.status).toBe(401)
    expect(res.body).toEqual({ error: { code: 'unauthorized', message: 'Log in to continue.' } })
  })

  test('401 when the Authorization header is not a Bearer token', async () => {
    const res = await request(setup().app).get('/api/me').set('Authorization', 'Basic dGhhbmRp')
    expect(res.status).toBe(401)
    expect(res.body.error.code).toBe('unauthorized')
  })

  test('401 for an invalid or expired token', async () => {
    const res = await request(setup().app).get('/api/me').set('Authorization', 'Bearer forged')
    expect(res.status).toBe(401)
    expect(res.body).toEqual({ error: { code: 'unauthorized', message: 'Your session has expired. Log in again.' } })
  })

  test('200 with a valid token returns the caller’s profile and role', async () => {
    const res = await request(setup().app).get('/api/me').set('Authorization', `Bearer ${thandi.token}`)
    expect(res.status).toBe(200)
    expect(res.body).toEqual({
      profile: { id: 'u-thandi', email: 'thandi@lefa.test', full_name: 'Thandi Mokoena', phone: '+27820000001', role: 'member' },
    })
  })

  test('queries the database as the user (their token), so RLS applies', async () => {
    const { app, supabase } = setup()
    await request(app).get('/api/me').set('Authorization', `Bearer ${naledi.token}`)
    expect(supabase.clientsCreatedWith).toEqual([naledi.token])
  })

  test('503 (not 401) when the login service is unreachable', async () => {
    const res = await request(setup({ users: [thandi], authDown: true }).app)
      .get('/api/me')
      .set('Authorization', `Bearer ${thandi.token}`)
    expect(res.status).toBe(503)
    expect(res.body.error.code).toBe('auth_unavailable')
  })

  test('404 when the account has no profile row', async () => {
    const res = await request(setup({ users: [{ ...thandi, hasProfile: false }] }).app)
      .get('/api/me')
      .set('Authorization', `Bearer ${thandi.token}`)
    expect(res.status).toBe(404)
    expect(res.body.error.code).toBe('profile_not_found')
  })

  test('503 when the API was started without Supabase settings', async () => {
    const res = await request(createApp({ logger: silent })).get('/api/me').set('Authorization', 'Bearer x')
    expect(res.status).toBe(503)
    expect(res.body.error.code).toBe('auth_unavailable')
  })
})

describe('requireRole', () => {
  function roleApp() {
    const app = express()
    app.get('/broker-only', requireAuth(createFakeSupabase({ users: [thandi, naledi] })), requireRole('broker', 'admin'), (_req, res) => {
      res.json({ ok: true, role: res.locals.profile.role })
    })
    app.use(errorHandler(silent))
    return app
  }

  test('a member gets 403', async () => {
    const res = await request(roleApp()).get('/broker-only').set('Authorization', `Bearer ${thandi.token}`)
    expect(res.status).toBe(403)
    expect(res.body).toEqual({ error: { code: 'forbidden', message: "You don't have access to this." } })
  })

  test('a broker is allowed through, with the profile available to the route', async () => {
    const res = await request(roleApp()).get('/broker-only').set('Authorization', `Bearer ${naledi.token}`)
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true, role: 'broker' })
  })
})

describe('error handler', () => {
  test('unknown /api routes return a JSON 404', async () => {
    const res = await request(setup().app).get('/api/nope')
    expect(res.status).toBe(404)
    expect(res.body).toEqual({ error: { code: 'not_found', message: 'Not found.' } })
  })

  test('malformed JSON returns 400 invalid_json', async () => {
    const res = await request(setup().app)
      .post('/api/me')
      .set('Content-Type', 'application/json')
      .send('{"broken":')
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('invalid_json')
  })

  test('unexpected errors return a generic 500 and are logged, without leaking details', async () => {
    const logger = { error: jest.fn() }
    const app = createApp({ supabase: createFakeSupabase({ users: [thandi], dbError: true }), logger })
    const res = await request(app).get('/api/me').set('Authorization', `Bearer ${thandi.token}`)
    expect(res.status).toBe(500)
    expect(res.body).toEqual({ error: { code: 'internal_error', message: 'Something went wrong. Try again.' } })
    expect(JSON.stringify(res.body)).not.toMatch(/secret detail/)
    expect(logger.error).toHaveBeenCalled()
  })
})
