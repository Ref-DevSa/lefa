import { useState } from 'react'
import { Button } from '../../components/ui/Button.jsx'
import { Card } from '../../components/ui/Card.jsx'
import { EmptyState } from '../../components/ui/EmptyState.jsx'
import { Modal } from '../../components/ui/Modal.jsx'
import { useToast } from '../../components/ui/useToast.js'
import { cn } from '../../lib/cn.js'
import { formatDate } from '../../lib/format.js'
import { MemberShell } from '../vault/MemberShell.jsx'
import { usePolicies } from '../vault/queries.js'
import { DOC_TYPES, docTypeLabel, formatBytes } from './docFormat.js'
import { useDeleteDocument, useDocuments } from './queries.js'
import { UploadForm } from './UploadForm.jsx'
import { useOpenDocument } from './useOpenDocument.js'

/** Documents (S6): upload claim documents and see what's stored. */
export default function DocumentsPage() {
  const documents = useDocuments()
  const policies = usePolicies()
  const [filter, setFilter] = useState('all')
  const [deleting, setDeleting] = useState(/** @type {Record<string, any> | null} */ (null))
  const list = documents.data ?? []
  const policyName = (/** @type {string | null} */ id) => policies.data?.find((p) => p.id === id)?.insurer

  const types = DOC_TYPES.filter((t) => list.some((d) => d.doc_type === t.value))
  const shown = filter === 'all' ? list : list.filter((d) => d.doc_type === filter)

  return (
    <MemberShell>
      <div className="flex flex-col gap-6">
        <Card className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-ink sm:text-3xl">Documents</h1>
            <p className="mt-1 text-muted">Have claim documents ready before your family needs them.</p>
          </div>
          <p className="inline-flex items-center gap-2 self-start rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary sm:self-auto">
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <rect x="5" y="11" width="14" height="10" rx="2" />
              <path d="M8 11V8a4 4 0 0 1 8 0v3" />
            </svg>
            Private · only you can see these
          </p>
        </Card>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <Card as="section" aria-labelledby="upload-heading" className="self-start">
            <h2 id="upload-heading" className="mb-4 text-lg font-semibold text-ink">
              Upload a document
            </h2>
            <UploadForm />
          </Card>

          <section aria-labelledby="stored-heading" className="flex min-w-0 flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="stored-heading" className="text-lg font-semibold text-ink">
                Your documents <span className="font-normal text-muted">({list.length})</span>
              </h2>
              {types.length > 1 && (
                <div role="group" aria-label="Filter by type" className="flex flex-wrap gap-1">
                  {[{ value: 'all', label: 'All' }, ...types].map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      aria-pressed={filter === t.value}
                      onClick={() => setFilter(t.value)}
                      className={cn(
                        'min-h-9 rounded-full border px-3 text-sm font-medium',
                        filter === t.value ? 'border-primary bg-primary text-on-primary' : 'border-border bg-surface text-muted hover:text-ink',
                      )}
                    >
                      {t.label} ({t.value === 'all' ? list.length : list.filter((d) => d.doc_type === t.value).length})
                    </button>
                  ))}
                </div>
              )}
            </div>

            {documents.isPending && <div aria-label="Loading documents" className="h-40 animate-pulse rounded-card bg-border/50" />}
            {documents.isError && (
              <Card className="flex flex-col items-center gap-3 py-8 text-center">
                <p className="text-ink">We couldn&apos;t load your documents. They&apos;re safe.</p>
                <Button onClick={() => documents.refetch()}>Try again</Button>
              </Card>
            )}
            {documents.isSuccess && list.length === 0 && (
              <EmptyState
                title="No documents yet"
                description="Start with a certified copy of your ID and a bank confirmation letter. They count for every policy."
              />
            )}
            {shown.length > 0 && (
              <ul className="flex flex-col gap-2">
                {shown.map((d) => (
                  <DocumentRow key={d.id} doc={d} policyName={policyName(d.policy_id)} onDelete={() => setDeleting(d)} />
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      <ConfirmDelete doc={deleting} onClose={() => setDeleting(null)} />
    </MemberShell>
  )
}

/** @param {{ doc: Record<string, any>, policyName?: string, onDelete: () => void }} props */
function DocumentRow({ doc, policyName, onDelete }) {
  const open = useOpenDocument()
  const isImage = doc.mime_type !== 'application/pdf'
  return (
    <li aria-label={doc.file_name} className="flex flex-wrap items-center gap-3 rounded-card border border-border bg-surface p-3 shadow-soft sm:flex-nowrap">
      <span
        aria-hidden="true"
        className={cn(
          'grid size-10 shrink-0 place-items-center rounded-control text-xs font-bold',
          isImage ? 'bg-info/10 text-info' : 'bg-danger/10 text-danger',
        )}
      >
        {isImage ? 'IMG' : 'PDF'}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-ink">{doc.file_name}</p>
        <p className="flex flex-wrap gap-x-2 text-sm text-muted">
          <span>{docTypeLabel(doc.doc_type)}</span>
          {policyName && (
            <>
              <span aria-hidden="true">·</span>
              <span>{policyName}</span>
            </>
          )}
          <span aria-hidden="true">·</span>
          <span>{formatBytes(doc.size_bytes)}</span>
          <span aria-hidden="true">·</span>
          <span>{formatDate(doc.created_at)}</span>
        </p>
      </div>
      <div className="flex gap-1">
        <Button variant="ghost" size="sm" aria-label={`View ${doc.file_name}`} onClick={() => open(doc)}>
          View
        </Button>
        <Button variant="ghost" size="sm" aria-label={`Delete ${doc.file_name}`} className="text-danger hover:bg-danger/5" onClick={onDelete}>
          Delete
        </Button>
      </div>
    </li>
  )
}

/** @param {{ doc: Record<string, any> | null, onClose: () => void }} props */
function ConfirmDelete({ doc, onClose }) {
  const remove = useDeleteDocument()
  const toast = useToast()
  async function handleDelete() {
    if (!doc) return
    try {
      await remove.mutateAsync(doc.id)
      toast(`${doc.file_name} deleted`, 'success')
    } catch (err) {
      toast(/** @type {Error} */ (err).message || 'Something went wrong. Try again.', 'error')
    }
    onClose()
  }
  return (
    <Modal
      open={!!doc}
      onClose={onClose}
      title="Delete this document?"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Keep it
          </Button>
          <Button variant="danger" loading={remove.isPending} onClick={handleDelete}>
            Delete document
          </Button>
        </>
      }
    >
      <p>{doc?.file_name} will be permanently deleted from your vault.</p>
    </Modal>
  )
}
