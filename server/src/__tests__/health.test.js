import request from 'supertest'
import { createApp } from '../app.js'

const app = createApp()

test('GET /api/health returns ok', async () => {
  const res = await request(app).get('/api/health')
  expect(res.status).toBe(200)
  expect(res.body).toEqual({ status: 'ok' })
})

test('unknown /api route returns JSON 404', async () => {
  const res = await request(app).get('/api/nope')
  expect(res.status).toBe(404)
  expect(res.body).toEqual({ error: 'Not found' })
})
