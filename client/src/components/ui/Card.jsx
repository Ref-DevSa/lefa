import { cn } from '../../lib/cn.js'

/** @param {React.HTMLAttributes<HTMLElement> & { as?: 'div' | 'section' | 'article' | 'li' }} props */
export function Card({ as: Tag = 'div', className, children, ...rest }) {
  return (
    <Tag
      className={cn(
        'rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-[var(--shadow-soft)] sm:p-6',
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  )
}
