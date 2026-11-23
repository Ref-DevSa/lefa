import { useContext } from 'react'
import { AuthContext } from './AuthContext.js'

/** Who is logged in, their profile/role, and the sign-in/up/out actions. */
export function useAuth() {
  return useContext(AuthContext)
}
