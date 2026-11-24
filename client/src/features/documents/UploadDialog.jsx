import { Modal } from '../../components/ui/Modal.jsx'
import { docTypeLabel } from './docFormat.js'
import { UploadForm } from './UploadForm.jsx'

/**
 * Upload dialog, pre-filled from the checklist item that opened it.
 * @param {{ open: boolean, onClose: () => void, docType?: string, policyId?: string }} props
 */
export function UploadDialog({ open, onClose, docType = '', policyId = '' }) {
  const title = docType ? `Upload ${docTypeLabel(docType)}` : 'Upload a document'
  return (
    <Modal open={open} onClose={onClose} title={title} size="lg">
      {open && (
        <UploadForm key={`${docType}-${policyId}`} label={title} defaultType={docType} defaultPolicyId={policyId} onUploaded={onClose} />
      )}
    </Modal>
  )
}
