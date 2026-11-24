import { Router } from 'express'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { HttpError } from '../lib/httpError.js'
import { dbError } from '../lib/dbError.js'
import { parseBody, requireUuid } from '../lib/validate.js'
import { createPolicySchema, updatePolicySchema } from '../schemas/policy.js'

export const POLICY_COLUMNS =
  'id, owner_id, insurer, policy_number, type, cover_amount, monthly_premium, debit_day, status, beneficiaries, notes, created_at, updated_at'

const DUPLICATE = /** @type {[string, string]} */ (['duplicate_policy', "You've already added this policy to your vault."])
const notFound = () => new HttpError(404, 'not_found', 'That policy was not found.')

/**
 * /api/policies: a member's own policies (PRD §6).
 *
 * Every query runs with the member's token (RLS), and also filters on
 * owner_id = the caller. RLS would already hide other families' rows; the
 * explicit filter makes "only mine" true even for an admin calling this.
 * @param {import('../lib/supabase.js').SupabaseFactory | undefined} supabase
 */
export function policiesRouter(supabase) {
  const router = Router()
  router.use(requireAuth(supabase), requireRole('member'))

  router.get('/', async (_req, res) => {
    const { data, error } = await res.locals.supabase
      .from('policies')
      .select(POLICY_COLUMNS)
      .eq('owner_id', res.locals.user.id)
      .order('created_at', { ascending: false })
    if (error) throw dbError(error)
    res.json({ policies: data })
  })

  router.get('/:id', async (req, res) => {
    const id = requireUuid(req.params.id, 'That policy')
    const { data, error } = await res.locals.supabase
      .from('policies')
      .select(POLICY_COLUMNS)
      .eq('id', id)
      .eq('owner_id', res.locals.user.id)
      .maybeSingle()
    if (error) throw dbError(error)
    if (!data) throw notFound()
    res.json({ policy: data })
  })

  router.post('/', async (req, res) => {
    const values = parseBody(createPolicySchema, req.body)
    const { data, error } = await res.locals.supabase.from('policies').insert(values).select(POLICY_COLUMNS).single()
    if (error) throw dbError(error, { duplicate: DUPLICATE })
    res.status(201).json({ policy: data })
  })

  router.patch('/:id', async (req, res) => {
    const id = requireUuid(req.params.id, 'That policy')
    const values = parseBody(updatePolicySchema, req.body)
    const { data, error } = await res.locals.supabase
      .from('policies')
      .update(values)
      .eq('id', id)
      .eq('owner_id', res.locals.user.id)
      .select(POLICY_COLUMNS)
      .maybeSingle()
    if (error) throw dbError(error, { duplicate: DUPLICATE })
    // Someone else's policy looks exactly like a missing one: 404, not 403,
    // so the API never confirms that another family's policy exists.
    if (!data) throw notFound()
    res.json({ policy: data })
  })

  router.delete('/:id', async (req, res) => {
    const id = requireUuid(req.params.id, 'That policy')
    const { data, error } = await res.locals.supabase
      .from('policies')
      .delete()
      .eq('id', id)
      .eq('owner_id', res.locals.user.id)
      .select('id')
    if (error) throw dbError(error)
    if (!data?.length) throw notFound()
    res.status(204).end()
  })

  return router
}
