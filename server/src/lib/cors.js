import cors from 'cors'

/**
 * CORS_ORIGIN="https://lefa.vercel.app, http://localhost:5173" -> list.
 * @param {string | undefined} value
 */
export function parseOrigins(value) {
  const list = (value ?? '')
    .split(',')
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter(Boolean)
  return list.length ? list : ['http://localhost:5173']
}

/**
 * Browsers only let a website call an API on another address if the API says
 * so (CORS). We allow just the Lefa website(s), not every site on the
 * internet. Logins travel in the Authorization header, not cookies, so no
 * credentials mode is needed.
 * @param {string[]} origins
 */
export function corsMiddleware(origins) {
  return cors({
    origin: origins,
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Authorization', 'Content-Type'],
    maxAge: 600,
  })
}
