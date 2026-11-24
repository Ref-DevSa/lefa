import { randomUUID } from 'node:crypto'
import { Router } from 'express'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { HttpError } from '../lib/httpError.js'
import { dbError } from '../lib/dbError.js'
import { requireUuid } from '../lib/validate.js'
import { detectFileType, safeStorageName } from '../lib/fileType.js'
import { documentFieldsSchema } from '../schemas/document.js'
import { decodeFileName, singleFileUpload } from '../lib/upload.js'

const BUCKET = 'vault'
const SIGNED_URL_SECONDS = 60 // PRD §7: download links live for 60 seconds
export const DOCUMENT_COLUMNS = 'id, owner_id, policy_id, doc_type, file_name, storage_path, mime_type, size_bytes, created_at'

const notFound = () => new HttpError(404, 'not_found', 'That document was not found.')

/**
 * /api/documents: a member's claim documents (PRD M4, §6).
 *
 * Uploads go through the API (not straight from the browser to storage) so
 * the server can check the real file type and size before anything is
 * stored. Storage and database calls use the member's own token, so the
 * bucket's "own folder only" rules and the table's RLS still apply.
 * @param {import('../lib/supabase.js').SupabaseFactory | undefined} supabase
 */
export function documentsRouter(supabase) {
  const router = Router()
  router.use(requireAuth(supabase), requireRole('member'))

  router.get('/', async (_req, res) => {
    const { data, error } = await res.locals.supabase
      .from('documents')
      .select(DOCUMENT_COLUMNS)
      .eq('owner_id', res.locals.user.id)
      .order('created_at', { ascending: false })
    if (error) throw dbError(error)
    res.json({ documents: data })
  })

  router.post('/', singleFileUpload('file'), async (req, res) => {
    // 1. Check the form fields and that a file came with them.
    const parsed = documentFieldsSchema.safeParse(req.body ?? {})
    /** @type {Record<string, string>} */
    const fields = {}
    if (!parsed.success) for (const issue of parsed.error.issues) fields[String(issue.path[0])] ??= issue.message
    if (!req.file) fields.file = 'Choose a file to upload.'
    if (!parsed.success || !req.file) throw new HttpError(400, 'validation_failed', 'Check the highlighted fields.', fields)

    // 2. Check what the file really is.
    const type = detectFileType(req.file.buffer)
    if (!type) throw new HttpError(415, 'unsupported_file_type', 'Upload a PDF, JPG or PNG file.')

    // 3. Store it in the member's own folder: vault/{owner_id}/{uuid}-{name}
    const db = res.locals.supabase
    const fileName = decodeFileName(req.file.originalname)
    const path = `${res.locals.user.id}/${randomUUID()}-${safeStorageName(fileName, type.ext)}`
    const stored = await db.storage.from(BUCKET).upload(path, req.file.buffer, { contentType: type.mime, upsert: false })
    if (stored.error) {
      if (String(stored.error.statusCode) === '403') throw new HttpError(403, 'forbidden', "You don't have access to this.")
      throw new Error(`storage upload failed: ${stored.error.message}`)
    }

    // 4. Record it. If that fails (e.g. linking someone else's policy), remove
    //    the file again so nothing is left behind.
    const { data, error } = await db
      .from('documents')
      .insert({
        doc_type: parsed.data.doc_type,
        policy_id: parsed.data.policy_id,
        file_name: fileName,
        storage_path: path,
        mime_type: type.mime,
        size_bytes: req.file.size,
      })
      .select(DOCUMENT_COLUMNS)
      .single()
    if (error) {
      await db.storage.from(BUCKET).remove([path])
      throw dbError(error)
    }
    res.status(201).json({ document: data })
  })

  /** The caller's document row, or 404. */
  async function findOwn(/** @type {import('express').Response} */ res, /** @type {string} */ id) {
    const { data, error } = await res.locals.supabase
      .from('documents')
      .select(DOCUMENT_COLUMNS)
      .eq('id', requireUuid(id, 'That document'))
      .eq('owner_id', res.locals.user.id)
      .maybeSingle()
    if (error) throw dbError(error)
    if (!data) throw notFound()
    return data
  }

  // A private file can't be linked to directly; this hands out a link that
  // works for 60 seconds, long enough to open it, too short to share around.
  router.get('/:id/url', async (req, res) => {
    const doc = await findOwn(res, req.params.id)
    const { data, error } = await res.locals.supabase.storage.from(BUCKET).createSignedUrl(doc.storage_path, SIGNED_URL_SECONDS)
    if (error || !data?.signedUrl) throw notFound()
    res.json({ url: data.signedUrl, expires_in: SIGNED_URL_SECONDS })
  })

  router.delete('/:id', async (req, res) => {
    const doc = await findOwn(res, req.params.id)
    const { error } = await res.locals.supabase.from('documents').delete().eq('id', doc.id).eq('owner_id', res.locals.user.id)
    if (error) throw dbError(error)
    await res.locals.supabase.storage.from(BUCKET).remove([doc.storage_path])
    res.status(204).end()
  })

  return router
}
