import { randomUUID } from 'node:crypto'
import { Router } from 'express'
import { z } from 'zod'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { HttpError } from '../lib/httpError.js'
import { dbError } from '../lib/dbError.js'
import { detectFileType, safeStorageName } from '../lib/fileType.js'
import { decodeFileName, singleFileUpload } from '../lib/upload.js'

const BUCKET = 'death-certificates'
export const REPORT_COLUMNS =
  'id, owner_id, reported_by, date_of_death, certificate_path, dha_reference, notes, status, reviewed_by, reviewed_at, rejection_reason, created_at'

const todayIso = () => new Date().toISOString().slice(0, 10)

const reportSchema = z.object({
  owner_id: z.uuid({ error: 'Choose whose death you are reporting.' }),
  date_of_death: z
    .string({ error: 'Enter the date of death.' })
    .regex(/^\d{4}-\d{2}-\d{2}$/, { error: 'Enter the date of death.' })
    .refine((d) => d <= todayIso(), { error: 'The date of death cannot be in the future.' })
    .refine((d) => d >= '1900-01-01', { error: 'Check the date of death.' }),
  dha_reference: z.string().trim().max(60, { error: 'Keep the reference under 60 characters.' }).optional().default(''),
  notes: z.string().trim().max(1000, { error: 'Notes must be 1000 characters or fewer.' }).optional().default(''),
})

/**
 * /api/death-reports: an accepted nominee reports a death (PRD M5, S9).
 * The report starts as 'pending'; nothing unlocks until the family's broker
 * verifies it (#15). The certificate goes to a private bucket, in the
 * deceased's folder, and only nominees, the broker and admins can read it.
 * @param {import('../lib/supabase.js').SupabaseFactory | undefined} supabase
 */
export function deathReportsRouter(supabase) {
  const router = Router()

  router.post('/', requireAuth(supabase), requireRole('member'), singleFileUpload('certificate'), async (req, res) => {
    // 1. Check the form and that the certificate is attached.
    const parsed = reportSchema.safeParse(req.body ?? {})
    /** @type {Record<string, string>} */
    const fields = {}
    if (!parsed.success) for (const issue of parsed.error.issues) fields[String(issue.path[0])] ??= issue.message
    if (!req.file) fields.certificate = 'Attach the death certificate (PDF, JPG or PNG).'
    if (!parsed.success || !req.file) throw new HttpError(400, 'validation_failed', 'Check the highlighted fields.', fields)
    const values = parsed.data
    const db = res.locals.supabase
    const me = res.locals.user

    // 2. Only someone this person nominated (and who accepted) may report.
    const nomination = await db
      .from('nominees')
      .select('id')
      .eq('owner_id', values.owner_id)
      .eq('nominee_id', me.id)
      .eq('status', 'accepted')
      .maybeSingle()
    if (nomination.error) throw dbError(nomination.error)
    if (!nomination.data) throw new HttpError(403, 'forbidden', 'You can only report a death for someone who nominated you.')

    // 3. One open report per person: don't store a file we'd have to discard.
    const open = await db.from('death_reports').select('id').eq('owner_id', values.owner_id).neq('status', 'rejected').maybeSingle()
    if (open.error) throw dbError(open.error)
    if (open.data) throw new HttpError(409, 'report_exists', 'A death has already been reported for this person.')

    // 4. Check the certificate really is a PDF/JPG/PNG, then store it.
    const type = detectFileType(req.file.buffer)
    if (!type) throw new HttpError(415, 'unsupported_file_type', 'Upload the certificate as a PDF, JPG or PNG.')
    const path = `${values.owner_id}/${randomUUID()}-${safeStorageName(decodeFileName(req.file.originalname), type.ext)}`
    const stored = await db.storage.from(BUCKET).upload(path, req.file.buffer, { contentType: type.mime, upsert: false })
    if (stored.error) {
      if (String(stored.error.statusCode) === '403') throw new HttpError(403, 'forbidden', "You don't have access to this.")
      throw new Error(`certificate upload failed: ${stored.error.message}`)
    }

    // 5. File the report; if that fails, remove the certificate again.
    const { data, error } = await db
      .from('death_reports')
      .insert({
        owner_id: values.owner_id,
        date_of_death: values.date_of_death,
        certificate_path: path,
        dha_reference: values.dha_reference,
        notes: values.notes,
      })
      .select(REPORT_COLUMNS)
      .single()
    if (error) {
      await db.storage.from(BUCKET).remove([path])
      throw dbError(error, { duplicate: ['report_exists', 'A death has already been reported for this person.'] })
    }
    res.status(201).json({ report: data })
  })

  return router
}
