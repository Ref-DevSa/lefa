import express from 'express'
import { corsMiddleware } from './lib/cors.js'
import { errorHandler, notFound } from './middleware/errors.js'
import { meRouter } from './routes/me.js'
import { policiesRouter } from './routes/policies.js'
import { vaultRouter } from './routes/vault.js'
import { documentsRouter } from './routes/documents.js'
import { nomineesRouter } from './routes/nominees.js'

/**
 * Build the Express app. Exported separately from listen() so Supertest can
 * use it, and dependencies are passed in so tests can use fakes.
 * @param {{
 *   supabase?: import('./lib/supabase.js').SupabaseFactory,
 *   logger?: import('./middleware/errors.js').Logger,
 *   corsOrigins?: string[],
 * }} [deps]
 */
export function createApp({ supabase, logger = console, corsOrigins = ['http://localhost:5173'] } = {}) {
  const app = express()
  app.disable('x-powered-by')
  // Render (our host) sits in front of the app as a proxy; trust it so the
  // real visitor IP is used (needed for rate limiting later).
  app.set('trust proxy', 1)
  app.use(corsMiddleware(corsOrigins))
  app.use(express.json({ limit: '100kb' }))

  // Public
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' })
  })

  // Signed-in
  app.use('/api/me', meRouter(supabase))
  app.use('/api/policies', policiesRouter(supabase))
  app.use('/api/vault', vaultRouter(supabase))
  app.use('/api/documents', documentsRouter(supabase))
  app.use('/api', nomineesRouter(supabase)) // /api/nominees and /api/nominations

  app.use('/api', notFound)
  app.use(errorHandler(logger))

  return app
}
