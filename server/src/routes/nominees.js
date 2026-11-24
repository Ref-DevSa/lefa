import { Router } from 'express'
import { z } from 'zod'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { HttpError } from '../lib/httpError.js'
import { dbError } from '../lib/dbError.js'
import { parseBody, requireUuid } from '../lib/validate.js'

const RELATIONSHIPS = /** @type {const} */ (['spouse', 'child', 'parent', 'sibling', 'other'])
const MAX_ACTIVE = 3 // Family Plus allows 3 nominees (PRD §5 pricing)
const COLUMNS = 'id, owner_id, nominee_email, nominee_id, relationship, status, created_at, updated_at'

const inviteSchema = z.strictObject({
  email: z.string({ error: 'Enter their email address.' }).trim().toLowerCase().pipe(z.email({ error: 'Enter a valid email address.' })),
  relationship: z.enum(RELATIONSHIPS, { error: 'Choose how they are related to you.' }),
})
const actionSchema = z.strictObject({
  action: z.enum(['accept', 'decline', 'revoke', 'reinvite'], { error: 'Unknown action.' }),
})

/**
 * Allowed status changes. The database enforces the same rules with a
 * trigger; checking here gives clear messages.
 * owner: revoke (invited/accepted), reinvite (declined/revoked)
 * nominee: accept (invited), decline (invited/accepted)
 */
const TRANSITIONS = {
  revoke: { by: 'owner', from: ['invited', 'accepted'], to: 'revoked' },
  reinvite: { by: 'owner', from: ['declined', 'revoked'], to: 'invited' },
  accept: { by: 'nominee', from: ['invited'], to: 'accepted' },
  decline: { by: 'nominee', from: ['invited', 'accepted'], to: 'declined' },
}

const notFound = () => new HttpError(404, 'not_found', 'That nomination was not found.')

/**
 * /api/nominees (my nominees) and /api/nominations (where I'm the nominee).
 * PRD M3: nominees see only the owner's name until a death is verified.
 * @param {import('../lib/supabase.js').SupabaseFactory | undefined} supabase
 */
export function nomineesRouter(supabase) {
  const router = Router()
  // Only these paths: other /api addresses must still reach the 404 handler.
  router.use(['/nominees', '/nominations'], requireAuth(supabase), requireRole('member'))

  router.get('/nominees', async (_req, res) => {
    const { data, error } = await res.locals.supabase
      .from('nominees')
      .select(COLUMNS)
      .eq('owner_id', res.locals.user.id)
      .order('created_at', { ascending: false })
    if (error) throw dbError(error)
    res.json({ nominees: data })
  })

  router.post('/nominees', async (req, res) => {
    const values = parseBody(inviteSchema, req.body)
    if (values.email === String(res.locals.user.email).toLowerCase()) {
      throw new HttpError(400, 'validation_failed', 'Check the highlighted fields.', { email: "You can't nominate yourself. Choose someone you trust." })
    }
    const db = res.locals.supabase
    const existing = await db.from('nominees').select('status').eq('owner_id', res.locals.user.id)
    if (existing.error) throw dbError(existing.error)
    const active = (existing.data ?? []).filter((n) => n.status === 'invited' || n.status === 'accepted').length
    if (active >= MAX_ACTIVE) {
      throw new HttpError(422, 'nominee_limit', `You can have up to ${MAX_ACTIVE} nominees. Revoke one to invite someone else.`)
    }
    const { data, error } = await db
      .from('nominees')
      .insert({ nominee_email: values.email, relationship: values.relationship })
      .select(COLUMNS)
      .single()
    if (error) throw dbError(error, { duplicate: ['duplicate_nominee', "You've already invited this person."] })
    res.status(201).json({ nominee: data })
  })

  // Only the owner's name, relationship and status: nothing from the vault.
  router.get('/nominations', async (_req, res) => {
    const { data, error } = await res.locals.supabase.rpc('my_nominations')
    if (error) throw dbError(error)
    res.json({ nominations: data ?? [] })
  })

  router.patch('/nominees/:id', async (req, res) => {
    const id = requireUuid(req.params.id, 'That nomination')
    const { action } = parseBody(actionSchema, req.body)
    const db = res.locals.supabase
    const me = res.locals.user

    const { data: row, error } = await db.from('nominees').select(COLUMNS).eq('id', id).maybeSingle()
    if (error) throw dbError(error)
    if (!row) throw notFound()
    const actor = row.owner_id === me.id ? 'owner' : 'nominee'
    // A revoked or declined invitation disappears for the nominee.
    if (actor === 'nominee' && !['invited', 'accepted'].includes(row.status)) throw notFound()

    const rule = TRANSITIONS[action]
    if (rule.by !== actor) {
      throw new HttpError(403, 'forbidden', actor === 'owner' ? 'Only the person you nominated can accept or decline.' : 'Only the policyholder can do that.')
    }
    if (!rule.from.includes(row.status)) {
      throw new HttpError(409, 'invalid_transition', `This nomination is already ${row.status}.`)
    }

    const patch = { status: rule.to, ...(action === 'accept' ? { nominee_id: me.id } : {}) }
    const updated = await db.from('nominees').update(patch).eq('id', id).select(COLUMNS).maybeSingle()
    if (updated.error) throw dbError(updated.error)
    if (!updated.data) throw notFound()

    // Owners get the full row; nominees only learn the new status.
    if (actor === 'owner') res.json({ nominee: updated.data })
    else res.json({ nomination: { id, status: updated.data.status } })
  })

  return router
}
