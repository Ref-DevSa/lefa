import request from 'supertest'
import { createApp } from '../app.js'
import { parseOrigins } from '../lib/cors.js'

const app = createApp({
  corsOrigins: ['https://lefa.vercel.app', 'http://localhost:5173'],
  logger: { error: jest.fn() },
})

describe('CORS (which websites may call the API from a browser)', () => {
  test('the Lefa website is allowed', async () => {
    const res = await request(app).get('/api/health').set('Origin', 'https://lefa.vercel.app')
    expect(res.headers['access-control-allow-origin']).toBe('https://lefa.vercel.app')
  })

  test('any other website gets no CORS permission', async () => {
    const res = await request(app).get('/api/health').set('Origin', 'https://evil.example')
    expect(res.headers['access-control-allow-origin']).toBeUndefined()
  })

  test('preflight allows the Authorization header and the methods the app uses', async () => {
    const res = await request(app)
      .options('/api/policies')
      .set('Origin', 'https://lefa.vercel.app')
      .set('Access-Control-Request-Method', 'PATCH')
      .set('Access-Control-Request-Headers', 'authorization,content-type')
    expect(res.status).toBe(204)
    expect(res.headers['access-control-allow-methods']).toMatch(/PATCH/)
    expect(res.headers['access-control-allow-headers']).toMatch(/Authorization/i)
  })

  test('requests without an Origin (e.g. the host’s health check) still work', async () => {
    const res = await request(app).get('/api/health')
    expect(res.status).toBe(200)
  })
})

describe('parseOrigins', () => {
  test('reads a comma-separated list and ignores spaces, blanks and trailing slashes', () => {
    expect(parseOrigins(' https://lefa.vercel.app/ , http://localhost:5173,, ')).toEqual([
      'https://lefa.vercel.app',
      'http://localhost:5173',
    ])
  })

  test('defaults to the local dev site', () => {
    expect(parseOrigins(undefined)).toEqual(['http://localhost:5173'])
  })
})
