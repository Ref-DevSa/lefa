import { createContext, useContext } from 'react'

/** @type {import('react').Context<import('../lib/api.js').Api | null>} */
export const ApiContext = createContext(/** @type {import('../lib/api.js').Api | null} */ (null))

/** The Lefa API client. Must be used inside <AppProviders>. */
export function useApi() {
  const api = useContext(ApiContext)
  if (!api) throw new Error('useApi must be used inside <AppProviders>')
  return api
}
