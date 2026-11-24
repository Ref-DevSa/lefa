/** Claim statuses from PRD §4 (M5) and their labels/colours. */
export const CLAIM_STATUS = {
  not_started: { label: 'Not started', className: 'bg-muted/10 text-muted' },
  submitted: { label: 'Submitted', className: 'bg-info/10 text-info' },
  documents_requested: { label: 'Documents requested', className: 'bg-warning/10 text-warning' },
  approved: { label: 'Approved', className: 'bg-success/10 text-success' },
  paid: { label: 'Paid', className: 'bg-success text-on-primary' },
  rejected: { label: 'Rejected', className: 'bg-danger/10 text-danger' },
}
