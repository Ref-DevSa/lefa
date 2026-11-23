import { Card } from './Card.jsx'

/** @param {{ label: string, value: React.ReactNode, hint?: string, icon?: React.ReactNode }} props */
export function StatTile({ label, value, hint, icon }) {
  return (
    <Card className="flex items-start gap-3">
      {icon && (
        <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
          {icon}
        </span>
      )}
      <dl className="min-w-0">
        <dt className="text-sm text-muted">{label}</dt>
        <dd className="text-2xl font-bold text-ink">{value}</dd>
        {hint && <dd className="text-sm text-muted">{hint}</dd>}
      </dl>
    </Card>
  )
}
