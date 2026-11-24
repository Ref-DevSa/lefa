import { HttpError } from './httpError.js'

/**
 * Translate a Postgres/PostgREST error into a safe API error. Known cases get
 * a clear status and message; anything else becomes a plain Error, which the
 * error handler logs and hides behind a generic 500.
 * @param {{ code?: string, message?: string }} error
 * @param {{ duplicate?: [code: string, message: string] }} [messages]
 */
export function dbError(error, messages = {}) {
  switch (error.code) {
    case '23505': {
      const [code, message] = messages.duplicate ?? ['duplicate', 'That already exists.']
      return new HttpError(409, code, message)
    }
    case '23514': // check constraint
    case '22P02': // invalid text representation
    case '22003': // numeric out of range
      return new HttpError(400, 'validation_failed', 'Some values are not allowed. Check the form and try again.')
    case '42501': // RLS / permission denied
      return new HttpError(403, 'forbidden', "You don't have access to this.")
    default:
      return new Error(`database error ${error.code ?? ''}: ${error.message ?? 'unknown'}`)
  }
}
