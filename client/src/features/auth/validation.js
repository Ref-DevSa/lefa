// Form rules for sign-up and log-in (PRD M1). Kept as plain functions so
// they're easy to test and reuse. The database enforces its own limits too
// (e.g. full_name <= 120 chars); these just give friendlier, earlier feedback.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const NAME_MAX = 120

/**
 * Turn a South African number in any common format into +27XXXXXXXXX.
 * Accepts "82 123 4567", "082 123 4567", "+27 82 123 4567", "(082) 123-4567".
 * @param {string} raw
 * @returns {string | null}
 */
export function normalizeSaPhone(raw) {
  const compact = raw.replace(/[\s()-]/g, '')
  const match = compact.match(/^(?:\+27|27|0)?([1-9]\d{8})$/)
  return match ? `+27${match[1]}` : null
}

/** @param {string} email */
function emailError(email) {
  if (!email) return 'Enter your email address.'
  if (!EMAIL_RE.test(email)) return 'Enter a valid email address, like thabo@example.co.za.'
  return undefined
}

/**
 * @param {{ email: string, password: string }} input
 */
export function validateLogin({ email, password }) {
  const values = { email: email.trim().toLowerCase(), password }
  /** @type {Record<string, string>} */
  const errors = {}
  const e = emailError(values.email)
  if (e) errors.email = e
  if (!password) errors.password = 'Enter your password.'
  return { errors, values }
}

/**
 * @param {{ fullName: string, email: string, phone: string, password: string, consent: boolean }} input
 */
export function validateSignup({ fullName, email, phone, password, consent }) {
  const name = fullName.trim().replace(/\s+/g, ' ')
  const normalizedPhone = normalizeSaPhone(phone)
  const values = {
    fullName: name,
    email: email.trim().toLowerCase(),
    phone: normalizedPhone ?? '',
    password,
  }

  /** @type {Record<string, string>} */
  const errors = {}
  if (name.length < 2) errors.fullName = 'Enter your full name.'
  else if (name.length > NAME_MAX) errors.fullName = `Your name must be ${NAME_MAX} characters or fewer.`

  const e = emailError(values.email)
  if (e) errors.email = e

  if (!normalizedPhone) errors.phone = 'Enter a South African mobile number, like 82 123 4567.'

  if (!password) errors.password = 'Enter a password.'
  else if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    errors.password = 'Use at least 8 characters, with a letter and a number.'
  }

  if (!consent) errors.consent = 'Please agree to the privacy notice to continue.'

  return { errors, values }
}
