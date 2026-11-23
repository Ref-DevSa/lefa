import { useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router'
import { Button } from '../../components/ui/Button.jsx'
import { Input } from '../../components/ui/Input.jsx'
import { PageLoader } from '../../components/layout/PageLoader.jsx'
import { AuthLayout } from './AuthLayout.jsx'
import { FormAlert } from './FormAlert.jsx'
import { useAuth } from './useAuth.js'
import { homeFor, safeRedirect } from './roles.js'
import { validateLogin } from './validation.js'

export default function LoginPage() {
  const { status, profile, signIn } = useAuth()
  const location = useLocation()
  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState(/** @type {Record<string, string>} */ ({}))
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Already logged in (or just logged in): go to where they were heading,
  // otherwise to their role's home page.
  if (status === 'signedIn' && profile) {
    return <Navigate to={safeRedirect(location.state) ?? homeFor(profile.role)} replace />
  }
  if (status === 'loading') return <PageLoader />

  /** @param {React.ChangeEvent<HTMLInputElement>} e */
  const update = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  /** @param {React.FormEvent<HTMLFormElement>} e */
  async function handleSubmit(e) {
    e.preventDefault()
    setFormError('')
    const { errors: found, values } = validateLogin(form)
    setErrors(found)
    if (Object.keys(found).length) return

    setSubmitting(true)
    const { error } = await signIn(values.email, values.password)
    if (error) {
      setFormError(error)
      setSubmitting(false)
    }
    // On success the session listener loads the profile and the redirect above runs.
  }

  return (
    <AuthLayout title="Log in to your vault" subtitle="Welcome back. Your family's cover, all in one place.">
      <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-5">
        {formError && <FormAlert>{formError}</FormAlert>}
        <Input
          id="email"
          name="email"
          type="email"
          label="Email"
          autoComplete="email"
          placeholder="thabo@example.co.za"
          value={form.email}
          onChange={update}
          error={errors.email}
          required
        />
        <Input
          id="password"
          name="password"
          type="password"
          label="Password"
          autoComplete="current-password"
          value={form.password}
          onChange={update}
          error={errors.password}
          required
        />
        <Button type="submit" fullWidth loading={submitting}>
          Log in
        </Button>
        <p className="text-center text-muted">
          New to Lefa?{' '}
          <Link to="/signup" className="font-semibold text-primary hover:underline">
            Create your vault
          </Link>
        </p>
      </form>
    </AuthLayout>
  )
}
