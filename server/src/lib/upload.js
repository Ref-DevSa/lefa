import multer from 'multer'
import { HttpError } from './httpError.js'

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024 // 5 MB (PRD M4)

/**
 * Accept one file in a multipart form field, held in memory (max 5 MB) only
 * long enough to check and store it. Multer errors become friendly API errors.
 * @param {string} field form field name, e.g. 'file' or 'certificate'
 * @returns {import('express').RequestHandler}
 */
export function singleFileUpload(field) {
  const receive = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_UPLOAD_BYTES, files: 1, fields: 10 },
  }).single(field)

  return (req, res, next) => {
    receive(req, res, (err) => {
      if (!err) return next()
      if (err.code === 'LIMIT_FILE_SIZE') return next(new HttpError(413, 'file_too_large', 'Files can be up to 5 MB. Try a smaller scan or photo.'))
      return next(new HttpError(400, 'invalid_upload', "We couldn't read that upload. Try again."))
    })
  }
}

/** Multer reads file names as latin1; browsers send UTF-8. @param {string} name */
export const decodeFileName = (name) => Buffer.from(name, 'latin1').toString('utf8').trim().slice(0, 200) || 'document'
