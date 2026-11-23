import request from 'supertest'
import { createApp } from '../app.js'

const app = createApp()

test('GET /api/health returns ok', async () => {
  const res = await request(app).get('/api/health')
  expect(res.status).toBe(200)
  expect(res.body).toEqual({ status: 'ok' })
})

test('health works without Supabase settings (used by the host to check the API is up)', async () => {
  const res = await request(app).get('/api/health')
  expect(res.status).toBe(200)
})
