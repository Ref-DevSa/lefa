import { cn } from '../../lib/cn.js'
import { Field } from './Field.jsx'
import { controlClass } from './controlClass.js'

/**
 * @param {React.InputHTMLAttributes<HTMLInputElement> & {
 *   id: string, label: string, helper?: string, error?: string
 * }} props
 */
export function Input({ id, label, helper, error, required, className, ...rest }) {
  return (
    <Field id={id} label={label} helper={helper} error={error} required={required}>
      {(aria) => (
        <input
          {...aria}
          required={required}
          className={cn(controlClass, error ? 'border-danger' : 'border-border', className)}
          {...rest}
        />
      )}
    </Field>
  )
}
