import { Router } from 'express'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { dbError } from '../lib/dbError.js'

/** @param {number | string} rands */
const toCents = (rands) => Math.round(Number(rands) * 100)

/**
 * Totals for the top of My Vault (PRD M2), e.g. "R85 000 cover across 2
 * insurers, R487.50 a month". Only *active* policies count towards cover and
 * premiums: lapsed policies won't pay out and paid-up ones don't debit.
 * Sums are done in whole cents so R199.10 + R0.20 is exactly R199.30.
 * @param {Array<{ insurer: string, cover_amount: number | string, monthly_premium: number | string, status: string }>} policies
 */
export function summarise(policies) {
  const active = policies.filter((p) => p.status === 'active')
  return {
    policy_count: policies.length,
    active_count: active.length,
    total_active_cover: active.reduce((sum, p) => sum + toCents(p.cover_amount), 0) / 100,
    monthly_premiums: active.reduce((sum, p) => sum + toCents(p.monthly_premium), 0) / 100,
    insurer_count: new Set(active.map((p) => p.insurer.trim().toLowerCase())).size,
  }
}

/**
 * /api/vault: summary of the caller's own vault.
 * @param {import('../lib/supabase.js').SupabaseFactory | undefined} supabase
 */
export function vaultRouter(supabase) {
  const router = Router()
  router.use(requireAuth(supabase), requireRole('member'))

  router.get('/summary', async (_req, res) => {
    const { data, error } = await res.locals.supabase
      .from('policies')
      .select('insurer, cover_amount, monthly_premium, status')
      .eq('owner_id', res.locals.user.id)
    if (error) throw dbError(error)
    res.json({ summary: summarise(data ?? []) })
  })

  return router
}
