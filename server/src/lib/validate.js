import { HttpError } from './httpError.js'

/**
 * Check a request body against a zod schema. On failure, throw a 400 with one
 * message per field so the form can show each error next to its input:
 *   { error: { code: 'validation_failed', message, fields: { insurer: '…' } } }
 * @template T
 * @param {import('zod').ZodType<T>} schema
 * @param {unknown} body
 * @returns {T}
 */
export function parseBody(schema, body) {
  const result = schema.safeParse(body ?? {})
  if (result.success) return result.data

  /** @type {Record<string, string>} */
  const fields = {}
  /** @type {string[]} */
  const general = []
  for (const issue of result.error.issues) {
    if (issue.code === 'unrecognized_keys') {
      general.push(`Unknown field${issue.keys.length > 1 ? 's' : ''}: ${issue.keys.join(', ')}.`)
    } else if (issue.path.length) {
      const key = String(issue.path[0])
      fields[key] ??= issue.message // keep the first message per field
    } else {
      general.push(issue.message)
    }
  }
  throw new HttpError(400, 'validation_failed', general.join(' ') || 'Check the highlighted fields.', fields)
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * A malformed id can't match anything, so answer 404 straight away instead of
 * letting the database raise a type error (which would look like a 500).
 * @param {string} id
 * @param {string} [what]
 */
export function requireUuid(id, what = 'That item') {
  if (!UUID_RE.test(id)) throw new HttpError(404, 'not_found', `${what} was not found.`)
  return id
}
