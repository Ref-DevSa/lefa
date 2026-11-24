import { Router } from 'express'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth.js'
import { HttpError } from '../lib/httpError.js'
import { dbError } from '../lib/dbError.js'
import { parseBody, requireUuid } from '../lib/validate.js'
import { POLICY_COLUMNS } from './policies.js'
import { DOCUMENT_COLUMNS } from './documents.js'

const CLAIM_STATUSES = /** @type {const} */ (['not_started', 'submitted', 'documents_requested', 'approved', 'paid', 'rejected'])
const SIGNED_URL_SECONDS = 60

const locked = () =>
  new HttpError(403, 'vault_locked', 'This vault is locked. It opens once a broker has verified the death.')

/**
 * /api/vaults/:ownerId: a deceased member's vault, read-only, for their
 * accepted nominees (and their broker / admins). Opens only after a verified
 * death report; the database's RLS enforces the same rule underneath.
 * /api/claims/:id: move a claim to a new status with a note (logged).
 * @param {import('../lib/supabase.js').SupabaseFactory | undefined} supabase
 */
export function vaultsRouter(supabase) {
  const router = Router()
  router.use(['/vaults', '/claims'], requireAuth(supabase))

  /** The verified report that opened this vault, or 403. */
  async function verifiedReport(/** @type {any} */ db, /** @type {string} */ ownerId) {
    const { data, error } = await db
      .from('death_reports')
      .select('id, owner_id, date_of_death, status, reviewed_at')
      .eq('owner_id', ownerId)
      .eq('status', 'verified')
      .maybeSingle()
    if (error) throw dbError(error)
    if (!data) throw locked()
    return data
  }

  router.get('/vaults/:ownerId', async (req, res) => {
    const ownerId = requireUuid(req.params.ownerId, 'That vault')
    const db = res.locals.supabase
    const report = await verifiedReport(db, ownerId)

    const [owner, policies, documents, claims] = await Promise.all([
      db.from('profiles').select('id, full_name').eq('id', ownerId).maybeSingle(),
      db.from('policies').select(POLICY_COLUMNS).eq('owner_id', ownerId).order('created_at', { ascending: true }),
      db.from('documents').select(DOCUMENT_COLUMNS).eq('owner_id', ownerId).order('created_at', { ascending: false }),
      db.from('claims').select('id, policy_id, status, created_at, updated_at').eq('death_report_id', report.id),
    ])
    for (const r of [owner, policies, documents, claims]) if (r.error) throw dbError(r.error)
    if (!owner.data) throw locked()

    const claimIds = (claims.data ?? []).map((/** @type {any} */ c) => c.id)
    const events = claimIds.length
      ? await db.from('claim_events').select('id, claim_id, from_status, to_status, note, created_at').in('claim_id', claimIds).order('created_at', { ascending: true })
      : { data: [], error: null }
    if (events.error) throw dbError(events.error)

    res.json({
      vault: {
        owner: owner.data,
        report,
        policies: policies.data,
        documents: documents.data,
        claims: (claims.data ?? []).map((/** @type {any} */ c) => ({
          ...c,
          events: (events.data ?? []).filter((/** @type {any} */ e) => e.claim_id === c.id),
        })),
      },
    })
  })

  // A 60-second link to one of the deceased's documents.
  router.get('/vaults/:ownerId/documents/:docId/url', async (req, res) => {
    const ownerId = requireUuid(req.params.ownerId, 'That vault')
    const docId = requireUuid(req.params.docId, 'That document')
    const db = res.locals.supabase
    const doc = await db.from('documents').select('storage_path').eq('id', docId).eq('owner_id', ownerId).maybeSingle()
    if (doc.error) throw dbError(doc.error)
    if (!doc.data) throw new HttpError(404, 'not_found', 'That document was not found.')
    const signed = await db.storage.from('vault').createSignedUrl(doc.data.storage_path, SIGNED_URL_SECONDS)
    if (signed.error || !signed.data?.signedUrl) throw new HttpError(404, 'not_found', 'That document was not found.')
    res.json({ url: signed.data.signedUrl, expires_in: SIGNED_URL_SECONDS })
  })

  const claimUpdateSchema = z.strictObject({
    status: z.enum(CLAIM_STATUSES, { error: 'Choose a claim status.' }),
    note: z.string().trim().max(500, { error: 'Keep the note under 500 characters.' }).optional().default(''),
  })

  router.patch('/claims/:id', async (req, res) => {
    const id = requireUuid(req.params.id, 'That claim')
    const { status, note } = parseBody(claimUpdateSchema, req.body)
    const { data, error } = await res.locals.supabase.rpc('update_claim_status', { claim_id: id, new_status: status, note })
    if (error) {
      if (error.code === '42501') throw new HttpError(403, 'forbidden', "You can't update this claim.")
      if (error.code === '22023') throw new HttpError(409, 'invalid_transition', error.message)
      throw dbError(error)
    }
    res.json({ claim: { id, status: data } })
  })

  return router
}
