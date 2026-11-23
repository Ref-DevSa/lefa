import { cn } from '../../lib/cn.js'
import { Field } from './Field.jsx'
import { controlClass } from './controlClass.js'

/**
 * @param {React.SelectHTMLAttributes<HTMLSelectElement> & {
 *   id: string, label: string, helper?: string, error?: string, placeholder?: string,
 *   options: { value: string, label: string }[]
 * }} props
 */
export function Select({ id, label, helper, error, required, options, placeholder, className, ...rest }) {
  return (
    <Field id={id} label={label} helper={helper} error={error} required={required}>
      {(aria) => (
        <select
          {...aria}
          required={required}
          className={cn(controlClass, 'pr-8', error ? 'border-danger' : 'border-border', className)}
          {...rest}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}
    </Field>
  )
}
