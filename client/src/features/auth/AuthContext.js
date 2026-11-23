import { createContext } from 'react'

/** @typedef {import('./roles.js').Role} Role */
/** @typedef {{ id: string, email: string, full_name: string, phone: string | null, role: Role }} Profile */
/** @typedef {'loading' | 'signedOut' | 'signedIn' | 'error'} AuthStatus */
/** @typedef {{ fullName: string, email: string, phone: string, password: string }} SignupInput */
/**
 * @typedef {{
 *   status: AuthStatus,
 *   profile: Profile | null,
 *   signIn: (email: string, password: string) => Promise<{ error: string | null }>,
 *   signUp: (input: SignupInput) => Promise<{ error: string | null, needsConfirmation?: boolean }>,
 *   signOut: () => Promise<void>,
 *   retry: () => void,
 * }} AuthValue
 */

const unavailable = async () => ({ error: 'Sign-in is not available right now.' })

/**
 * Default when no AuthProvider is mounted (e.g. public pages in tests):
 * behaves as "logged out".
 * @type {import('react').Context<AuthValue>}
 */
export const AuthContext = createContext(
  /** @type {AuthValue} */ ({
    status: 'signedOut',
    profile: null,
    signIn: unavailable,
    signUp: unavailable,
    signOut: async () => {},
    retry: () => {},
  }),
)
