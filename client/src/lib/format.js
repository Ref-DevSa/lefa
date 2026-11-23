const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/**
 * Format rands the Lefa way: "R85 000", "R1 250 000", "R29.50".
 * Cents are shown only when the amount isn't whole.
 * @param {number} amount
 */
export function formatZAR(amount) {
  if (!Number.isFinite(amount)) return '—'
  const negative = amount < 0
  const abs = Math.abs(amount)
  const whole = Math.trunc(Math.round(abs * 100) / 100)
  const cents = Math.round((abs - whole) * 100)
  const grouped = String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  const text = `R${grouped}${cents ? `.${String(cents).padStart(2, '0')}` : ''}`
  return negative ? `-${text}` : text
}

/**
 * Format a date as "22 Nov 2026". Accepts a Date or an ISO date string.
 * Date-only strings (YYYY-MM-DD) are read as local dates, not UTC.
 * @param {Date | string} value
 */
export function formatDate(value) {
  const date =
    typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? new Date(Number(value.slice(0, 4)), Number(value.slice(5, 7)) - 1, Number(value.slice(8, 10)))
      : new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`
}
