import { useState } from 'react'
import { Link } from 'react-router'
import { Button } from '../../components/ui/Button.jsx'
import { Card } from '../../components/ui/Card.jsx'
import { cn } from '../../lib/cn.js'
import { CLAIM_TIME_DOCS, checklistFor } from './docFormat.js'
import { useDocuments } from './queries.js'
import { UploadDialog } from './UploadDialog.jsx'
import { useOpenDocument } from './useOpenDocument.js'

/**
 * Claim-ready checklist for one policy (PRD M4): what's uploaded, what's
 * missing (one tap to upload it), and what the nominee will need later.
 * @param {{ policyId: string }} props
 */
export function ClaimChecklist({ policyId }) {
  const documents = useDocuments()
  const open = useOpenDocument()
  const [uploading, setUploading] = useState(/** @type {string | null} */ (null))
  const items = checklistFor(policyId, documents.data ?? [])
  const ready = items.filter((i) => i.done).length
  const linked = (documents.data ?? []).filter((d) => d.policy_id === policyId)

  return (
    <Card as="section" aria-labelledby="checklist-heading">
      <div className="flex items-start justify-between gap-2">
        <h2 id="checklist-heading" className="text-lg font-semibold text-ink">
          Claim-ready checklist
        </h2>
        {documents.isSuccess && (
          <span
            className={cn(
              'shrink-0 rounded-full px-2.5 py-0.5 text-sm font-medium',
              ready === items.length ? 'bg-success/10 text-success' : 'bg-accent/15 text-ink',
            )}
          >
            {ready} of {items.length} ready
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-muted">Have these ready so your family can claim without delays.</p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-border" aria-hidden="true">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(ready / items.length) * 100}%` }} />
      </div>

      <ul className="mt-4 flex flex-col gap-2">
        {items.map((item) => (
          <li
            key={item.type}
            aria-label={`${item.label}: ${item.done ? 'ready' : 'missing'}`}
            className={cn('flex items-start gap-3 rounded-control px-3 py-2.5', item.done ? 'bg-success/5' : 'bg-cream')}
          >
            <span
              aria-hidden="true"
              className={cn(
                'mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-xs font-bold',
                item.done ? 'bg-success text-on-primary' : 'border-2 border-border',
              )}
            >
              {item.done ? '✓' : ''}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-medium text-ink">{item.label}</span>
              {item.done && item.document ? (
                <button type="button" onClick={() => open(item.document)} className="text-sm break-all text-primary hover:underline">
                  {item.document.file_name}
                </button>
              ) : (
                <span className="text-sm text-muted">{item.perPolicy ? 'For this policy' : 'Counts for all your policies'}</span>
              )}
            </span>
            {!item.done && (
              <Button size="sm" variant="secondary" aria-label={`Upload ${item.label}`} onClick={() => setUploading(item.type)}>
                Upload
              </Button>
            )}
          </li>
        ))}
      </ul>

      {linked.length > 0 && (
        <p className="mt-3 text-sm text-muted">
          {linked.length} document{linked.length === 1 ? '' : 's'} linked to this policy ·{' '}
          <Link to="/documents" className="font-medium text-primary hover:underline">
            See all documents
          </Link>
        </p>
      )}

      <h3 className="mt-6 text-sm font-semibold tracking-wide text-muted uppercase">Needed at claim time</h3>
      <p className="mt-1 text-sm text-muted">Your nominee will upload these, and Lefa guides them step by step.</p>
      <ul className="mt-2 list-disc pl-5 text-sm text-ink">
        {CLAIM_TIME_DOCS.map((doc) => (
          <li key={doc}>{doc}</li>
        ))}
      </ul>

      <UploadDialog open={!!uploading} onClose={() => setUploading(null)} docType={uploading ?? ''} policyId={policyId} />
    </Card>
  )
}
