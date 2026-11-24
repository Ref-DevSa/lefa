import { useState } from 'react'
import { Button } from '../../components/ui/Button.jsx'
import { Field } from '../../components/ui/Field.jsx'
import { Input } from '../../components/ui/Input.jsx'
import { Modal } from '../../components/ui/Modal.jsx'
import { Select } from '../../components/ui/Select.jsx'
import { controlClass } from '../../components/ui/controlClass.js'
import { useToast } from '../../components/ui/useToast.js'
import { cn } from '../../lib/cn.js'
import { FormAlert } from '../auth/FormAlert.jsx'
import { EMPTY_FORM, INSURER_SUGGESTIONS, POLICY_STATUSES, POLICY_TYPES, formFromPolicy, validatePolicyForm } from './policyFormat.js'
import { useSavePolicy } from './queries.js'

/**
 * Add / edit policy (S4). A modal on desktop; on phones it fills the screen.
 * Checks the form first, then shows any message the API sends back next to
 * the right field.
 * @param {{ open: boolean, onClose: () => void, policy?: Record<string, any> }} props
 */
export function PolicyFormModal({ open, onClose, policy }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={policy ? 'Edit policy' : 'Add a policy'}
      description={policy ? undefined : 'Record it once, so the people you love can claim it.'}
    >
      {/* Remount on each open so the form starts fresh. */}
      {open && <PolicyForm key={policy?.id ?? 'new'} policy={policy} onDone={onClose} />}
    </Modal>
  )
}

/** @param {{ policy?: Record<string, any>, onDone: () => void }} props */
function PolicyForm({ policy, onDone }) {
  const [form, setForm] = useState(() => (policy ? formFromPolicy(policy) : EMPTY_FORM))
  const [errors, setErrors] = useState(/** @type {Record<string, string>} */ ({}))
  const [formError, setFormError] = useState('')
  const save = useSavePolicy()
  const toast = useToast()

  /** @param {keyof typeof EMPTY_FORM} key @param {string} value */
  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }))
  /** @param {React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>} e */
  const onChange = (e) => set(/** @type {keyof typeof EMPTY_FORM} */ (e.target.name), e.target.value)

  /** @param {React.FormEvent<HTMLFormElement>} e */
  async function handleSubmit(e) {
    e.preventDefault()
    setFormError('')
    const { errors: found, values } = validatePolicyForm(form)
    setErrors(found)
    if (Object.keys(found).length) return

    try {
      const saved = await save.mutateAsync({ id: policy?.id, values })
      toast(`${saved.insurer} policy ${policy ? 'updated' : 'added'}`, 'success')
      onDone()
    } catch (err) {
      const apiError = /** @type {import('../../lib/api.js').ApiError} */ (err)
      if (apiError.fields && Object.keys(apiError.fields).length) setErrors(apiError.fields)
      else setFormError(apiError.message || 'Something went wrong. Try again.')
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-5">
      {formError && <FormAlert>{formError}</FormAlert>}

      <div className="flex flex-col gap-2">
        <Input
          id="policy-insurer"
          name="insurer"
          label="Insurer"
          placeholder="e.g. Old Mutual"
          autoComplete="off"
          value={form.insurer}
          onChange={onChange}
          error={errors.insurer}
          required
        />
        <div className="flex flex-wrap gap-2" aria-label="Common insurers" role="group">
          {INSURER_SUGGESTIONS.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => set('insurer', name)}
              aria-pressed={form.insurer === name}
              className={cn(
                'min-h-9 rounded-full border px-3 text-sm font-medium transition-colors',
                form.insurer === name ? 'border-primary bg-primary text-on-primary' : 'border-border bg-cream text-ink hover:border-primary',
              )}
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      <Input
        id="policy-number"
        name="policy_number"
        label="Policy number"
        placeholder="e.g. OM-104821"
        autoComplete="off"
        value={form.policy_number}
        onChange={onChange}
        error={errors.policy_number}
        required
      />

      <fieldset>
        <legend className="mb-1.5 text-sm font-medium text-ink">Policy type</legend>
        <div className="grid grid-cols-2 gap-1 rounded-control bg-cream p-1 sm:grid-cols-4">
          {POLICY_TYPES.map((t) => (
            <label
              key={t.value}
              className={cn(
                'flex min-h-10 cursor-pointer items-center justify-center rounded-[8px] px-2 text-sm font-medium',
                'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-primary',
                form.type === t.value ? 'bg-surface text-primary shadow-soft' : 'text-muted hover:text-ink',
              )}
            >
              <input type="radio" name="type" value={t.value} checked={form.type === t.value} onChange={onChange} className="sr-only" />
              {t.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-2">
        <RandInput id="policy-cover" name="cover_amount" label="Cover amount" value={form.cover_amount} onChange={onChange} error={errors.cover_amount} />
        <RandInput id="policy-premium" name="monthly_premium" label="Monthly premium" value={form.monthly_premium} onChange={onChange} error={errors.monthly_premium} />
        <Input
          id="policy-debit-day"
          name="debit_day"
          label="Debit day"
          inputMode="numeric"
          autoComplete="off"
          placeholder="e.g. 25"
          helper="Day of the month the premium comes off (1–31)."
          value={form.debit_day}
          onChange={onChange}
          error={errors.debit_day}
        />
        <Select id="policy-status" name="status" label="Status" options={POLICY_STATUSES} value={form.status} onChange={onChange} error={errors.status} />
      </div>

      <TextArea
        id="policy-beneficiaries"
        name="beneficiaries"
        label="Beneficiaries"
        placeholder="e.g. Lerato Mokoena (daughter), 100%"
        value={form.beneficiaries}
        onChange={onChange}
        error={errors.beneficiaries}
      />
      <TextArea
        id="policy-notes"
        name="notes"
        label="Notes"
        placeholder="Anything your family should know, e.g. where the paper copy is kept."
        value={form.notes}
        onChange={onChange}
        error={errors.notes}
      />

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" loading={save.isPending}>
          Save policy
        </Button>
      </div>
    </form>
  )
}

/**
 * Rand amount with an "R" in front. Text (not type="number") so people can
 * type "30 000" or "199,50" the way they're used to.
 * @param {{ id: string, name: string, label: string, value: string, error?: string,
 *   onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }} props
 */
function RandInput({ id, name, label, value, error, onChange }) {
  return (
    <Field id={id} label={label} error={error}>
      {(aria) => (
        <div className="flex">
          <span className="inline-flex items-center rounded-l-[var(--radius-control)] border border-r-0 border-border bg-cream px-3 text-muted">
            R
          </span>
          <input
            {...aria}
            name={name}
            inputMode="decimal"
            autoComplete="off"
            placeholder="0"
            value={value}
            onChange={onChange}
            className={cn(controlClass, 'rounded-l-none', error ? 'border-danger' : 'border-border')}
          />
        </div>
      )}
    </Field>
  )
}

/**
 * @param {{ id: string, name: string, label: string, value: string, placeholder?: string, error?: string,
 *   onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void }} props
 */
function TextArea({ id, name, label, value, placeholder, error, onChange }) {
  return (
    <Field id={id} label={label} error={error}>
      {(aria) => (
        <textarea
          {...aria}
          name={name}
          rows={2}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          className={cn(controlClass, 'py-2', error ? 'border-danger' : 'border-border')}
        />
      )}
    </Field>
  )
}
