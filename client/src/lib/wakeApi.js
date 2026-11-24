import { API_URL } from './env.js'

/**
 * Our free API host puts the server to sleep after ~15 minutes without
 * visitors, and the first request then takes up to a minute. Pinging the
 * health check as soon as someone opens Lefa starts it waking up while they
 * read the landing page or log in. Failures are ignored: it's only a nudge.
 */
export function wakeApi() {
  fetch(`${API_URL}/api/health`).catch(() => {})
}
