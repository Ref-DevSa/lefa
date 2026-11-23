/** @typedef {'member' | 'broker' | 'admin'} Role */

/**
 * Where each role lands after logging in (PRD M1).
 * @param {Role} role
 */
export function homeFor(role) {
  return role === 'member' ? '/vault' : '/broker'
}

/**
 * The page a logged-out user originally asked for, if it's safe to return to.
 * Only same-site paths are allowed, so a crafted link can't bounce someone to
 * another website after they log in.
 * @param {unknown} state router location.state
 * @returns {string | null}
 */
export function safeRedirect(state) {
  const from = state && typeof state === 'object' && 'from' in state ? state.from : null
  if (typeof from !== 'string' || !from.startsWith('/') || from.startsWith('//')) return null
  if (/^\/(login|signup)\b/.test(from)) return null
  return from
}
