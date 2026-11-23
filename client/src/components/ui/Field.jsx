import { cn } from '../../lib/cn.js'

/**
 * Label + control + helper/error text, wired up for screen readers.
 * @param {{ id: string, label: string, helper?: string, error?: string, required?: boolean,
 *   children: (aria: { id: string, 'aria-invalid'?: boolean, 'aria-describedby'?: string }) => React.ReactNode }} props
 */
export function Field({ id, label, helper, error, required, children }) {
  const helpId = helper || error ? `${id}-help` : undefined
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
        {required && (
          <span className="text-danger" aria-hidden="true">
            {' '}
            *
          </span>
        )}
      </label>
      {children({ id, 'aria-invalid': error ? true : undefined, 'aria-describedby': helpId })}
      {(error || helper) && (
        <p id={helpId} className={cn('text-sm', error ? 'text-danger' : 'text-muted')}>
          {error || helper}
        </p>
      )}
    </div>
  )
}
