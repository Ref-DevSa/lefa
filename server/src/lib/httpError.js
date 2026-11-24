/**
 * An error that is safe to show the caller. Anything else that's thrown
 * becomes a generic 500, so internal details never leak to the browser.
 */
export class HttpError extends Error {
  /**
   * @param {number} status HTTP status code
   * @param {string} code stable machine-readable code, e.g. 'unauthorized'
   * @param {string} message calm, human-readable message
   * @param {Record<string, string>} [fields] per-field messages for forms
   */
  constructor(status, code, message, fields) {
    super(message)
    this.name = 'HttpError'
    this.status = status
    this.code = code
    this.fields = fields
  }
}
