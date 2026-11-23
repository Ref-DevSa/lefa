import { useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router'
import { Button } from '../../components/ui/Button.jsx'
import { Field } from '../../components/ui/Field.jsx'
import { Input } from '../../components/ui/Input.jsx'
import { controlClass } from '../../components/ui/controlClass.js'
import { PageLoader } from '../../components/layout/PageLoader.jsx'
import { cn } from '../../lib/cn.js'
import { AuthLayout } from './AuthLayout.jsx'
import { FormAlert } from './FormAlert.jsx'
import { useAuth } from './useAuth.js'
import { homeFor } from './roles.js'
import { validateSignup } from './validation.js'

const EMPTY = { fullName: '', email: '', phone: '', password: '', consent: false }

export default function SignupPage() {
  const { status, profile, signUp } = useAuth()
  const [params] = useSearchParams()
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState(/** @type {Record<string, string>} */ ({}))
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [checkEmail, setCheckEmail] = useState(false)

  if (status === 'signedIn' && profile) return <Navigate to={homeFor(profile.role)} replace />
  if (status === 'loading') return <PageLoader />

  if (checkEmail) {
    return (
      <AuthLayout title="Check your email" subtitle={`We sent a confirmation link to ${form.email.trim()}.`}>
        <p className="text-muted">
          Open the link to activate your vault, then{' '}
          <Link to="/login" className="font-semibold text-primary hover:underline">
            log in
          </Link>
          .
        </p>
      </AuthLayout>
    )
  }

  /** @param {React.ChangeEvent<HTMLInputElement>} e */
  const update = (e) => {
    const { name, type, checked, value } = e.target
    setForm({ ...form, [name]: type === 'checkbox' ? checked : value })
  }

  /** @param {React.FormEvent<HTMLFormElement>} e */
  async function handleSubmit(e) {
    e.preventDefault()
    setFormError('')
    const { errors: found, values } = validateSignup(form)
    setErrors(found)
    if (Object.keys(found).length) return

    setSubmitting(true)
    const result = await signUp(values)
    if (result.error) {
      setFormError(result.error)
      setSubmitting(false)
    } else if (result.needsConfirmation) {
      setCheckEmail(true)
    }
    // Otherwise the new session loads the profile and the redirect above runs.
  }

  const wantsBroker = params.get('as') === 'broker'

  return (
    <AuthLayout title="Create your family vault" subtitle="Protect your policies and give your loved ones clarity.">
      <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-5">
        {wantsBroker && (
          <p className="rounded-control border border-info/30 bg-info/5 px-3 py-2.5 text-sm text-info">
            Broker accounts are activated by Lefa after a quick check. Sign up below and we&apos;ll upgrade your
            account once you&apos;re verified.
          </p>
        )}
        {formError && <FormAlert>{formError}</FormAlert>}

        <Input
          id="fullName"
          name="fullName"
          label="Full name"
          autoComplete="name"
          placeholder="e.g. Thabo Molefe"
          value={form.fullName}
          onChange={update}
          error={errors.fullName}
          required
        />
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
        <Field id="phone" label="Phone" error={errors.phone} required>
          {(aria) => (
            <div className="flex">
              <span className="inline-flex items-center rounded-l-[var(--radius-control)] border border-r-0 border-border bg-cream px-3 text-muted">
                +27
              </span>
              <input
                {...aria}
                name="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel-national"
                placeholder="82 123 4567"
                value={form.phone}
                onChange={update}
                required
                className={cn(controlClass, 'rounded-l-none', errors.phone ? 'border-danger' : 'border-border')}
              />
            </div>
          )}
        </Field>
        <Input
          id="password"
          name="password"
          type="password"
          label="Password"
          autoComplete="new-password"
          placeholder="Create a strong password"
          helper="At least 8 characters, with a letter and a number."
          value={form.password}
          onChange={update}
          error={errors.password}
          required
        />

        <div className="flex flex-col gap-1.5">
          <label className="flex items-start gap-3 text-sm text-ink">
            <input
              type="checkbox"
              name="consent"
              checked={form.consent}
              onChange={update}
              aria-invalid={errors.consent ? true : undefined}
              aria-describedby={errors.consent ? 'consent-help' : undefined}
              className="mt-0.5 size-5 shrink-0 accent-primary"
            />
            <span>
              I agree to the privacy notice (POPIA): Lefa stores my details only to run my vault and never shares them
              without my consent.
            </span>
          </label>
          {errors.consent && (
            <p id="consent-help" className="text-sm text-danger">
              {errors.consent}
            </p>
          )}
        </div>

        <Button type="submit" fullWidth loading={submitting}>
          Create my vault
        </Button>
        <p className="text-center text-muted">
          Already have a vault?{' '}
          <Link to="/login" className="font-semibold text-primary hover:underline">
            Log in
          </Link>
        </p>
      </form>
    </AuthLayout>
  )
}
