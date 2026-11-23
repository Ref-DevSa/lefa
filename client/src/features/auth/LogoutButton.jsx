import { useNavigate } from 'react-router'
import { Button } from '../../components/ui/Button.jsx'
import { useAuth } from './useAuth.js'

export function LogoutButton() {
  const { signOut } = useAuth()
  const navigate = useNavigate()

  async function handleClick() {
    // Leave the protected page *first* (synchronously). Otherwise the
    // "logged out" update can reach the page before the navigation does, and
    // the guard would bounce the user to /login instead of home.
    navigate('/', { replace: true, flushSync: true })
    await signOut()
  }

  return (
    <Button variant="ghost" size="sm" onClick={handleClick}>
      Log out
    </Button>
  )
}
