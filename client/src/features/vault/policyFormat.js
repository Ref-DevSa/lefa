// Labels, formatting and form rules for policies (PRD M2). Pure functions,
// so they're easy to test. The API and database check the same rules again.

export const POLICY_TYPES = [
  { value: 'funeral', label: 'Funeral' },
  { value: 'life', label: 'Life' },
  { value: 'credit_life', label: 'Credit life' },
  { value: 'other', label: 'Other' },
]

export const POLICY_STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'lapsed', label: 'Lapsed' },
  { value: 'paid_up', label: 'Paid-up' },
]

/** Common SA insurers (PRD S4), offered as one-tap suggestions. */
export const INSURER_SUGGESTIONS = ['Old Mutual', 'Sanlam', 'Hollard', 'Assupol', 'Clientele', 'AVBOB', 'Metropolitan']

/** @param {string} value */
export const typeLabel = (value) => POLICY_TYPES.find((t) => t.value === value)?.label ?? value
/** @param {string} value */
export const statusLabel = (value) => POLICY_STATUSES.find((s) => s.value === value)?.label ?? value

/**
 * "OM-104821" -> "•••• 4821". Lists show only the last 4 characters, so a
 * glance over someone's shoulder doesn't reveal a full policy number.
 * @param {string} number
 */
export function maskPolicyNumber(number) {
  const s = number.trim()
  return s.length <= 4 ? s : `•••• ${s.slice(-4)}`
}

/** 1 -> "1st", 22 -> "22nd", 13 -> "13th". @param {number} n */
export function ordinal(n) {
  const teen = n % 100 >= 11 && n % 100 <= 13
  const suffix = teen ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' })[/** @type {1|2|3} */ (n % 10)] ?? 'th'
  return `${n}${suffix}`
}

/** "Old Mutual" -> "OM", "Sanlam" -> "SA". @param {string} name */
export function initials(name) {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (!words.length) return '?'
  const text = words.length > 1 ? words[0][0] + words[1][0] : words[0].slice(0, 2)
  return text.toUpperCase()
}

/**
 * Read a rand amount the way South Africans type it: "30 000", "R30 000",
 * "30,000", "199.50" or "199,50". Returns null when blank, NaN when invalid.
 * @param {string} text
 */
export function parseRand(text) {
  // \s also covers non-breaking spaces, which some phones and keyboards insert.
  let s = text.replace(/\s/g, '').replace(/^R/i, '')
  if (!s) return null
  // "199,50" (comma as decimal point) vs "30,000" (comma as thousands).
  if (!s.includes('.') && /,\d{1,2}$/.test(s)) s = s.replace(',', '.')
  else s = s.replace(/,/g, '')
  return /^\d+(\.\d+)?$/.test(s) ? Number(s) : NaN
}

const hasWholeCents = (/** @type {number} */ v) => Math.abs(v * 100 - Math.round(v * 100)) < 1e-6

export const EMPTY_FORM = {
  insurer: '',
  policy_number: '',
  type: 'funeral',
  status: 'active',
  cover_amount: '',
  monthly_premium: '',
  debit_day: '',
  beneficiaries: '',
  notes: '',
}

/** @typedef {typeof EMPTY_FORM} PolicyForm */

/** An existing policy as form text. @param {Record<string, any>} policy @returns {PolicyForm} */
export function formFromPolicy(policy) {
  return {
    insurer: policy.insurer ?? '',
    policy_number: policy.policy_number ?? '',
    type: policy.type ?? 'funeral',
    status: policy.status ?? 'active',
    cover_amount: policy.cover_amount == null ? '' : String(policy.cover_amount),
    monthly_premium: policy.monthly_premium == null ? '' : String(policy.monthly_premium),
    debit_day: policy.debit_day == null ? '' : String(policy.debit_day),
    beneficiaries: policy.beneficiaries ?? '',
    notes: policy.notes ?? '',
  }
}

/**
 * @param {string} label
 * @param {string} text
 * @param {number} max
 * @param {Record<string, string>} errors
 * @param {string} key
 */
function amount(label, text, max, errors, key) {
  const value = parseRand(text)
  if (value === null) return 0
  if (Number.isNaN(value)) errors[key] = 'Enter an amount in rand, like 30 000 or 199.50.'
  else if (!hasWholeCents(value)) errors[key] = 'Use at most 2 decimal places (cents).'
  else if (value > max) errors[key] = `${label} looks too large. Check the amount.`
  return value
}

/**
 * Check the form and turn it into the API payload (snake_case, numbers).
 * @param {PolicyForm} form
 */
export function validatePolicyForm(form) {
  /** @type {Record<string, string>} */
  const errors = {}
  const insurer = form.insurer.trim()
  const policyNumber = form.policy_number.trim()

  if (!insurer) errors.insurer = 'Insurer is required.'
  else if (insurer.length > 100) errors.insurer = 'Insurer must be 100 characters or fewer.'
  if (!policyNumber) errors.policy_number = 'Policy number is required.'
  else if (policyNumber.length > 60) errors.policy_number = 'Policy number must be 60 characters or fewer.'

  const cover = amount('Cover amount', form.cover_amount, 100_000_000, errors, 'cover_amount')
  const premium = amount('Monthly premium', form.monthly_premium, 1_000_000, errors, 'monthly_premium')

  /** @type {number | null} */
  let debitDay = null
  if (form.debit_day.trim()) {
    debitDay = Number(form.debit_day)
    if (!Number.isInteger(debitDay) || debitDay < 1 || debitDay > 31) errors.debit_day = 'Debit day must be between 1 and 31.'
  }

  if (form.beneficiaries.length > 500) errors.beneficiaries = 'Beneficiaries must be 500 characters or fewer.'
  if (form.notes.length > 1000) errors.notes = 'Notes must be 1000 characters or fewer.'

  return {
    errors,
    values: {
      insurer,
      policy_number: policyNumber,
      type: form.type,
      status: form.status,
      cover_amount: cover,
      monthly_premium: premium,
      debit_day: debitDay,
      beneficiaries: form.beneficiaries.trim(),
      notes: form.notes.trim(),
    },
  }
}

/**
 * The next debit order coming off the member's account, across active
 * policies: "25 Nov · R199 (Old Mutual)". Helps people keep enough money in
 * the account, the most common cause of lapses. A debit day past the end of
 * a short month (e.g. 31 in February) falls on the month's last day.
 * @param {Array<{ insurer: string, status: string, debit_day: number | null, monthly_premium: number }>} policies
 * @param {Date} today
 * @returns {{ date: Date, amount: number, insurers: string[] } | null}
 */
export function nextDebit(policies, today) {
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  /** @param {number} day @param {number} monthOffset */
  const onDay = (day, monthOffset) => {
    const y = start.getFullYear()
    const m = start.getMonth() + monthOffset
    const last = new Date(y, m + 1, 0).getDate()
    return new Date(y, m, Math.min(day, last))
  }

  /** @type {Map<number, { date: Date, cents: number, insurers: string[] }>} */
  const byDate = new Map()
  for (const p of policies) {
    if (p.status !== 'active' || !p.debit_day) continue
    let date = onDay(p.debit_day, 0)
    if (date < start) date = onDay(p.debit_day, 1)
    const entry = byDate.get(date.getTime()) ?? { date, cents: 0, insurers: [] }
    entry.cents += Math.round(p.monthly_premium * 100)
    entry.insurers.push(p.insurer)
    byDate.set(date.getTime(), entry)
  }
  const soonest = [...byDate.values()].sort((a, b) => a.date.getTime() - b.date.getTime())[0]
  return soonest ? { date: soonest.date, amount: soonest.cents / 100, insurers: soonest.insurers } : null
}
