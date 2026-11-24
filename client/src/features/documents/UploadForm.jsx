import { useId, useRef, useState } from 'react'
import { Button } from '../../components/ui/Button.jsx'
import { Select } from '../../components/ui/Select.jsx'
import { useToast } from '../../components/ui/useToast.js'
import { cn } from '../../lib/cn.js'
import { FormAlert } from '../auth/FormAlert.jsx'
import { usePolicies } from '../vault/queries.js'
import { ACCEPTED_TYPES, DOC_TYPES, formatBytes, validateFile } from './docFormat.js'
import { useUploadDocument } from './queries.js'

/**
 * Pick or drop a file, say what it is, optionally link it to a policy, upload.
 * Used on the Documents page and in the "Upload …" dialog on a policy.
 * @param {{ defaultType?: string, defaultPolicyId?: string, onUploaded?: () => void, label?: string }} props
 */
export function UploadForm({ defaultType = '', defaultPolicyId = '', onUploaded, label = 'Upload a document' }) {
  const id = useId()
  const inputRef = useRef(/** @type {HTMLInputElement | null} */ (null))
  const [file, setFile] = useState(/** @type {File | null} */ (null))
  const [fileError, setFileError] = useState('')
  const [docType, setDocType] = useState(defaultType)
  const [typeError, setTypeError] = useState('')
  const [policyId, setPolicyId] = useState(defaultPolicyId)
  const [formError, setFormError] = useState('')
  const [dragging, setDragging] = useState(false)
  const policies = usePolicies()
  const upload = useUploadDocument()
  const toast = useToast()

  /** @param {File | undefined} picked */
  function choose(picked) {
    setFormError('')
    if (!picked) return
    setFile(picked)
    setFileError(validateFile(picked) ?? '')
  }

  /** @param {React.FormEvent<HTMLFormElement>} e */
  async function handleSubmit(e) {
    e.preventDefault()
    setFormError('')
    if (!docType) {
      setTypeError('Choose what kind of document this is.')
      return
    }
    if (!file || fileError) return
    try {
      await upload.mutateAsync({ file, doc_type: docType, policy_id: policyId || null })
      toast(`${file.name} uploaded`, 'success')
      setFile(null)
      if (inputRef.current) inputRef.current.value = ''
      if (!defaultType) setDocType('')
      onUploaded?.()
    } catch (err) {
      setFormError(/** @type {Error} */ (err).message || 'Upload failed. Try again.')
    }
  }

  const policyOptions = [{ value: '', label: 'Not linked to a policy' }].concat(
    (policies.data ?? []).map((p) => ({ value: p.id, label: `${p.insurer} (${p.policy_number})` })),
  )

  return (
    <form aria-label={label} noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
      {formError && <FormAlert>{formError}</FormAlert>}

      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          choose(e.dataTransfer.files[0])
        }}
        className={cn(
          'relative flex flex-col items-center gap-2 rounded-card border-2 border-dashed px-4 py-6 text-center transition-colors',
          dragging ? 'border-primary bg-primary/5' : fileError ? 'border-danger bg-danger/5' : 'border-border bg-cream',
        )}
      >
        <svg viewBox="0 0 24 24" className="size-8 text-primary" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M12 16V4m0 0-4 4m4-4 4 4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" strokeLinecap="round" />
        </svg>
        {file ? (
          <p className="font-medium break-all text-ink">
            {file.name} <span className="font-normal text-muted">· {formatBytes(file.size)}</span>
          </p>
        ) : (
          <p className="text-ink">Drop a PDF, JPG or PNG here (up to 5 MB)</p>
        )}
        <label htmlFor={`${id}-file`} className="cursor-pointer font-semibold text-primary underline-offset-2 hover:underline">
          {file ? 'Choose a different file' : 'Choose a file'}
        </label>
        <input
          ref={inputRef}
          id={`${id}-file`}
          type="file"
          accept={ACCEPTED_TYPES.join(',')}
          onChange={(e) => choose(e.target.files?.[0])}
          aria-describedby={fileError ? `${id}-file-error` : undefined}
          aria-invalid={fileError ? true : undefined}
          className="sr-only"
        />
        {fileError && (
          <p id={`${id}-file-error`} className="text-sm text-danger">
            {fileError}
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          id={`${id}-type`}
          label="Document type"
          placeholder="Choose…"
          options={DOC_TYPES}
          value={docType}
          onChange={(e) => {
            setDocType(e.target.value)
            setTypeError('')
          }}
          error={typeError}
        />
        <Select
          id={`${id}-policy`}
          label="Link to a policy (optional)"
          options={policyOptions}
          value={policyId}
          onChange={(e) => setPolicyId(e.target.value)}
        />
      </div>

      <Button type="submit" loading={upload.isPending} disabled={!file || !!fileError}>
        Upload
      </Button>
    </form>
  )
}
