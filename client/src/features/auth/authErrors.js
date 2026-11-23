/**
 * Turn Supabase Auth errors into calm, plain messages. Raw messages like
 * "Invalid login credentials" or "AuthRetryableFetchError" confuse people,
 * and some (e.g. "user not found") would tell an attacker which emails exist.
 * @param {{ code?: string, status?: number, name?: string, message?: string }} error
 * @returns {string}
 */
export function friendlyAuthError(error) {
  const code = error.code ?? ''
  const message = (error.message ?? '').toLowerCase()

  if (code === 'invalid_credentials' || message.includes('invalid login credentials')) {
    return 'Incorrect email or password.'
  }
  if (code === 'user_already_exists' || code === 'email_exists' || message.includes('already registered')) {
    return 'An account with this email already exists. Log in instead.'
  }
  if (code === 'email_not_confirmed') {
    return 'Please confirm your email first. Check your inbox for the link.'
  }
  if (code === 'weak_password') {
    return 'Choose a stronger password: at least 8 characters, with a letter and a number.'
  }
  if (error.status === 429 || code.startsWith('over_')) {
    return 'Too many attempts. Wait a minute and try again.'
  }
  if (error.name === 'AuthRetryableFetchError' || error.status === 0 || message.includes('failed to fetch')) {
    return "We couldn't reach Lefa. Check your connection and try again."
  }
  return 'Something went wrong. Try again.'
}
