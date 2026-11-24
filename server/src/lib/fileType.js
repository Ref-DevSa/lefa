/**
 * Work out a file's real type from its first bytes ("magic numbers") rather
 * than trusting its name or the browser. A program renamed to "invoice.pdf"
 * still starts with "MZ", so it's refused.
 *
 * Only the three types Lefa accepts are recognised.
 * @param {Buffer} buffer
 * @returns {{ mime: 'application/pdf' | 'image/png' | 'image/jpeg', ext: 'pdf' | 'png' | 'jpg' } | null}
 */
export function detectFileType(buffer) {
  if (buffer.length >= 5 && buffer.subarray(0, 5).toString('latin1') === '%PDF-') {
    return { mime: 'application/pdf', ext: 'pdf' }
  }
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
  if (buffer.length >= 8 && png.every((b, i) => buffer[i] === b)) {
    return { mime: 'image/png', ext: 'png' }
  }
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mime: 'image/jpeg', ext: 'jpg' }
  }
  return null
}

/**
 * A safe storage file name: letters, digits, dots, dashes and underscores,
 * with the extension that matches the real type.
 * @param {string} name original file name
 * @param {string} ext extension from detectFileType
 */
export function safeStorageName(name, ext) {
  const base = name.replace(/\.[^.]*$/, '').normalize('NFKD').replace(/[^\w.-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80)
  return `${base || 'document'}.${ext}`
}
