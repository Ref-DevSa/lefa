// Document types, the claim-ready checklist and file rules (PRD M4).

export const DOC_TYPES = [
  { value: 'certified_id', label: 'Certified ID copy' },
  { value: 'bank_letter', label: 'Bank confirmation letter' },
  { value: 'policy_schedule', label: 'Policy schedule' },
  { value: 'marriage_certificate', label: 'Marriage certificate' },
  { value: 'birth_certificate', label: 'Birth certificate (child)' },
  { value: 'other', label: 'Other' },
]

/** @param {string} value */
export const docTypeLabel = (value) => DOC_TYPES.find((t) => t.value === value)?.label ?? value

/**
 * What a member can prepare for each policy's claim. Their ID and bank letter
 * are the same for every policy, so one upload ticks them everywhere. A policy
 * schedule belongs to one policy.
 */
export const OWNER_CHECKLIST = [
  { type: 'certified_id', label: 'Certified ID copy', perPolicy: false },
  { type: 'bank_letter', label: 'Bank confirmation letter', perPolicy: false },
  { type: 'policy_schedule', label: 'Policy schedule', perPolicy: true },
]

/** Needed only at claim time; the nominee provides these (#13–#14). */
export const CLAIM_TIME_DOCS = ['Death certificate', 'BI-1663 notice of death', "Claimant's ID and proof of relationship"]

/**
 * @param {string} policyId
 * @param {Array<Record<string, any>>} documents
 */
export function checklistFor(policyId, documents) {
  return OWNER_CHECKLIST.map((item) => {
    const document =
      documents.find((d) => d.doc_type === item.type && (!item.perPolicy || d.policy_id === policyId)) ?? null
    return { ...item, done: !!document, document }
  })
}

/**
 * Claim-readiness across the vault, e.g. 7 of 9 (3 items per policy).
 * @param {Array<Record<string, any>>} policies
 * @param {Array<Record<string, any>>} documents
 */
export function readiness(policies, documents) {
  let ready = 0
  for (const p of policies) ready += checklistFor(p.id, documents).filter((i) => i.done).length
  return { ready, needed: policies.length * OWNER_CHECKLIST.length }
}

export const MAX_FILE_BYTES = 5 * 1024 * 1024
export const ACCEPTED_TYPES = ['application/pdf', 'image/jpeg', 'image/png']

/** @param {number} bytes */
export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(/\.0$/, '')} MB`
}

/**
 * Quick check in the browser so people don't wait for an upload that will be
 * refused. The API checks again, using the file's real content.
 * @param {File} file
 * @returns {string | null} an error message, or null if fine
 */
export function validateFile(file) {
  if (!ACCEPTED_TYPES.includes(file.type)) return 'Upload a PDF, JPG or PNG file.'
  if (file.size > MAX_FILE_BYTES) return `This file is ${formatBytes(file.size)}. Files can be up to 5 MB.`
  return null
}
