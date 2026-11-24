import { Router } from 'express'
import { z } from 'zod'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { HttpError } from '../lib/httpError.js'
import { dbError } from '../lib/dbError.js'
import { parseBody, requireUuid } from '../lib/validate.js'
import { REPORT_COLUMNS } from './deathReports.js'

const OPEN_CLAIM = ['not_started', 'submitted', 'documents_requested', 'approved']
const SIGNED_URL_SECONDS = 60

/** @param {number | string} rands */
const toCents = (rands) => Math.round(Number(rands) * 100)

/** @param {{ error: any }[]} results */
function check(...results) {
  for (const r of results) if (r.error) throw dbError(r.error)
}

/** Name lookup for a set of profile ids the broker is allowed to see. */
async function namesFor(/** @type {any} */ db, /** @type {string[]} */ ids) {
  const unique = [...new Set(ids.filter(Boolean))]
  if (!unique.length) return /** @type {Record<string, any>} */ ({})
  const res = await db.from('profiles').select('id, full_name, phone').in('id', unique)
  check(res)
  return Object.fromEntries((res.data ?? []).map((/** @type {any} */ p) => [p.id, p]))
}

/**
 * /api/broker/*: the broker (and admin) side of Lefa (PRD M5, S11–S13).
 * Every query runs with the broker's own token, so RLS limits them to the
 * families they're linked to. Members get 403.
 * @param {import('../lib/supabase.js').SupabaseFactory | undefined} supabase
 */
export function brokerRouter(supabase) {
  const router = Router()
  router.use('/broker', requireAuth(supabase), requireRole('broker', 'admin'))

  // ---- Dashboard (S11) -------------------------------------------------------
  router.get('/broker/overview', async (_req, res) => {
    const db = res.locals.supabase
    const me = res.locals.user
    const [links, reports, claims] = await Promise.all([
      db.from('broker_clients').select('client_id').eq('broker_id', me.id),
      db.from('death_reports').select('id').eq('status', 'pending'),
      db.from('claims').select('id, policy_id, status'),
    ])
    check(links, reports, claims)

    const claimRows = claims.data ?? []
    const policyIds = claimRows.map((/** @type {any} */ c) => c.policy_id)
    const claimIds = claimRows.map((/** @type {any} */ c) => c.id)
    const [policies, events] = await Promise.all([
      policyIds.length ? db.from('policies').select('id, owner_id, insurer, cover_amount').in('id', policyIds) : { data: [], error: null },
      claimIds.length
        ? db.from('claim_events').select('id, claim_id, from_status, to_status, note, created_at').in('claim_id', claimIds).order('created_at', { ascending: false })
        : { data: [], error: null },
    ])
    check(policies, events)
    const policyById = Object.fromEntries((policies.data ?? []).map((/** @type {any} */ p) => [p.id, p]))
    const claimById = Object.fromEntries(claimRows.map((/** @type {any} */ c) => [c.id, c]))
    const names = await namesFor(db, (policies.data ?? []).map((/** @type {any} */ p) => p.owner_id))

    // Paid this month: claims whose move to "paid" happened this calendar month.
    const month = new Date().toISOString().slice(0, 7)
    const paidThisMonth = new Set(
      (events.data ?? []).filter((/** @type {any} */ e) => e.to_status === 'paid' && String(e.created_at).startsWith(month)).map((/** @type {any} */ e) => e.claim_id),
    )
    const paidCents = [...paidThisMonth].reduce((sum, id) => sum + toCents(policyById[claimById[id]?.policy_id]?.cover_amount ?? 0), 0)

    res.json({
      overview: {
        clients: (links.data ?? []).length,
        pending_reports: (reports.data ?? []).length,
        open_claims: claimRows.filter((/** @type {any} */ c) => OPEN_CLAIM.includes(c.status)).length,
        paid_this_month: paidCents / 100,
      },
      activity: (events.data ?? []).slice(0, 10).map((/** @type {any} */ e) => {
        const policy = policyById[claimById[e.claim_id]?.policy_id] ?? {}
        return { ...e, insurer: policy.insurer, owner_id: policy.owner_id, owner_name: names[policy.owner_id]?.full_name ?? '' }
      }),
    })
  })

  // ---- Death reports (queue + verify, S11/S12) ------------------------------
  router.get('/broker/reports', async (req, res) => {
    const db = res.locals.supabase
    const status = ['pending', 'verified', 'rejected'].includes(String(req.query.status)) ? String(req.query.status) : 'pending'
    const reports = await db.from('death_reports').select(REPORT_COLUMNS).eq('status', status).order('created_at', { ascending: true })
    check(reports)
    const rows = reports.data ?? []
    const [names, nominees] = await Promise.all([
      namesFor(db, rows.flatMap((/** @type {any} */ r) => [r.owner_id, r.reported_by])),
      rows.length ? db.from('nominees').select('owner_id, nominee_id, relationship').in('owner_id', rows.map((/** @type {any} */ r) => r.owner_id)) : { data: [], error: null },
    ])
    check(nominees)
    res.json({
      reports: rows.map((/** @type {any} */ r) => ({
        id: r.id,
        owner_id: r.owner_id,
        owner_name: names[r.owner_id]?.full_name ?? '',
        reporter_name: names[r.reported_by]?.full_name ?? 'Nominee',
        relationship:
          (nominees.data ?? []).find((/** @type {any} */ n) => n.owner_id === r.owner_id && n.nominee_id === r.reported_by)?.relationship ?? null,
        date_of_death: r.date_of_death,
        dha_reference: r.dha_reference,
        status: r.status,
        created_at: r.created_at,
      })),
    })
  })

  router.get('/broker/reports/:id', async (req, res) => {
    const id = requireUuid(req.params.id, 'That report')
    const db = res.locals.supabase
    const found = await db.from('death_reports').select(REPORT_COLUMNS).eq('id', id).maybeSingle()
    check(found)
    if (!found.data) throw new HttpError(404, 'not_found', 'That report was not found.')
    const r = found.data

    const [names, nominee, policies, signed] = await Promise.all([
      namesFor(db, [r.owner_id, r.reported_by]),
      db.from('nominees').select('relationship').eq('owner_id', r.owner_id).eq('nominee_id', r.reported_by).maybeSingle(),
      db.from('policies').select('id, insurer, policy_number, type, cover_amount, status').eq('owner_id', r.owner_id).order('created_at', { ascending: true }),
      db.storage.from('death-certificates').createSignedUrl(r.certificate_path, SIGNED_URL_SECONDS),
    ])
    check(nominee, policies)
    const ext = String(r.certificate_path).split('.').pop()?.toLowerCase()

    res.json({
      report: {
        ...r,
        owner: { id: r.owner_id, full_name: names[r.owner_id]?.full_name ?? '', phone: names[r.owner_id]?.phone ?? null },
        reporter: { id: r.reported_by, full_name: names[r.reported_by]?.full_name ?? 'Nominee', relationship: nominee.data?.relationship ?? null },
        certificate: signed.data?.signedUrl ? { url: signed.data.signedUrl, kind: ext === 'pdf' ? 'pdf' : 'image' } : null,
        // Active and paid-up policies become claims; lapsed ones won't pay out.
        policies: (policies.data ?? []).map((/** @type {any} */ p) => ({ ...p, will_claim: p.status === 'active' || p.status === 'paid_up' })),
      },
    })
  })

  /** Map the verify/reject function errors to clear API errors. @param {any} error */
  const reviewError = (error) => {
    if (error.code === '42501') return new HttpError(403, 'forbidden', "Only the family's broker or an admin can review this report.")
    if (error.code === '22023') return new HttpError(409, 'invalid_transition', error.message)
    return dbError(error)
  }

  // One step: verified + vault unlocked + a claim for every policy that can pay.
  router.post('/broker/reports/:id/verify', async (req, res) => {
    const id = requireUuid(req.params.id, 'That report')
    const { data, error } = await res.locals.supabase.rpc('verify_death_report', { report_id: id })
    if (error) throw reviewError(error)
    res.json({ report: { id, status: 'verified' }, claims_created: data })
  })

  const rejectSchema = z.object({
    reason: z.string({ error: 'Tell the family why, so they know what to fix.' }).trim().min(1, { error: 'Tell the family why, so they know what to fix.' }).max(500),
  })
  router.post('/broker/reports/:id/reject', async (req, res) => {
    const id = requireUuid(req.params.id, 'That report')
    const { reason } = parseBody(rejectSchema, req.body)
    const { error } = await res.locals.supabase.rpc('reject_death_report', { report_id: id, reason })
    if (error) throw reviewError(error)
    res.json({ report: { id, status: 'rejected' } })
  })

  // ---- Claims pipeline (S13) -------------------------------------------------
  router.get('/broker/claims', async (_req, res) => {
    const db = res.locals.supabase
    const claims = await db.from('claims').select('id, policy_id, status, created_at, updated_at').order('updated_at', { ascending: false })
    check(claims)
    const rows = claims.data ?? []
    const policies = rows.length
      ? await db.from('policies').select('id, owner_id, insurer, policy_number, cover_amount').in('id', rows.map((/** @type {any} */ c) => c.policy_id))
      : { data: [], error: null }
    check(policies)
    const policyById = Object.fromEntries((policies.data ?? []).map((/** @type {any} */ p) => [p.id, p]))
    const names = await namesFor(db, (policies.data ?? []).map((/** @type {any} */ p) => p.owner_id))
    res.json({
      claims: rows.map((/** @type {any} */ c) => {
        const p = policyById[c.policy_id] ?? {}
        return { ...c, insurer: p.insurer, policy_number: p.policy_number, cover_amount: p.cover_amount, owner_id: p.owner_id, owner_name: names[p.owner_id]?.full_name ?? '' }
      }),
    })
  })

  router.get('/broker/claims/:id/events', async (req, res) => {
    const id = requireUuid(req.params.id, 'That claim')
    const events = await res.locals.supabase
      .from('claim_events')
      .select('id, claim_id, actor_id, from_status, to_status, note, created_at')
      .eq('claim_id', id)
      .order('created_at', { ascending: true })
    check(events)
    res.json({ events: events.data })
  })

  return router
}
