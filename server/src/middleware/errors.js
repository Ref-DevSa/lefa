import { HttpError } from '../lib/httpError.js'

/** @typedef {{ error: (...args: any[]) => void }} Logger */

/**
 * @param {import('express').Request} _req
 * @param {import('express').Response} res
 */
export function notFound(_req, res) {
  res.status(404).json({ error: { code: 'not_found', message: 'Not found.' } })
}

/**
 * One place that turns every error into the PRD shape
 * `{ error: { code, message } }`. Known errors (HttpError) pass their message
 * through; anything unexpected is logged and hidden behind a generic 500 so
 * database or stack details never reach the browser.
 * @param {Logger} logger
 * @returns {import('express').ErrorRequestHandler}
 */
export function errorHandler(logger) {
  return (err, req, res, _next) => {
    if (err instanceof HttpError) {
      const body = { code: err.code, message: err.message, ...(err.fields && { fields: err.fields }) }
      res.status(err.status).json({ error: body })
      return
    }
    if (err?.type === 'entity.parse.failed') {
      res.status(400).json({ error: { code: 'invalid_json', message: 'The request body is not valid JSON.' } })
      return
    }
    if (err?.type === 'entity.too.large') {
      res.status(413).json({ error: { code: 'payload_too_large', message: 'The request is too large.' } })
      return
    }
    logger.error(`[${req.method} ${req.originalUrl}]`, err)
    res.status(500).json({ error: { code: 'internal_error', message: 'Something went wrong. Try again.' } })
  }
}
