import { Router } from 'express'
import { loadProfile, requireAuth } from '../middleware/auth.js'

/**
 * GET /api/me: who am I? Returns the caller's profile and role, which the
 * app uses to decide which screens to show.
 * @param {import('../lib/supabase.js').SupabaseFactory | undefined} supabase
 */
export function meRouter(supabase) {
  const router = Router()
  router.get('/', requireAuth(supabase), async (_req, res) => {
    res.json({ profile: await loadProfile(res) })
  })
  return router
}
