import { z } from 'zod'

export const DOCUMENT_TYPES = /** @type {const} */ ([
  'certified_id',
  'marriage_certificate',
  'birth_certificate',
  'bank_letter',
  'policy_schedule',
  'other',
])

export const MAX_FILE_BYTES = 5 * 1024 * 1024 // 5 MB (PRD M4)

/** The text fields that come with an upload (multipart form). */
export const documentFieldsSchema = z.object({
  doc_type: z.enum(DOCUMENT_TYPES, { error: 'Choose what kind of document this is.' }),
  // Optional link to one of the member's policies. An empty form field means "not linked".
  policy_id: z
    .union([z.literal(''), z.uuid({ error: 'Choose one of your policies.' })])
    .optional()
    .transform((v) => v || null),
})
