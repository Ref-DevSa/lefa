import express from 'express'
import { errorHandler, notFound } from './middleware/errors.js'
import { meRouter } from './routes/me.js'

/**
 * Build the Express app. Exported separately from listen() so Supertest can
 * use it, and dependencies are passed in so tests can use fakes.
 * @param {{
 *   supabase?: import('./lib/supabase.js').SupabaseFactory,
 *   logger?: import('./middleware/errors.js').Logger,
 * }} [deps]
 */
export function createApp({ supabase, logger = console } = {}) {
  const app = express()
  app.disable('x-powered-by')
  app.use(express.json({ limit: '100kb' }))

  // Public
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' })
  })

  // Signed-in
  app.use('/api/me', meRouter(supabase))

  app.use('/api', notFound)
  app.use(errorHandler(logger))

  return app
}
