// Nominee labels, form rules and the invitation message (PRD M3).

export const RELATIONSHIPS = [
  { value: 'spouse', label: 'Spouse' },
  { value: 'child', label: 'Child' },
  { value: 'parent', label: 'Parent' },
  { value: 'sibling', label: 'Sibling' },
  { value: 'other', label: 'Other' },
]

/** @param {string} value */
export const relationshipLabel = (value) => RELATIONSHIPS.find((r) => r.value === value)?.label ?? value

export const STATUS_LABELS = {
  invited: 'Invited',
  accepted: 'Accepted',
  declined: 'Declined',
  revoked: 'Revoked',
}

export const MAX_NOMINEES = 3

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/**
 * @param {{ email: string, relationship: string }} form
 * @param {string} ownEmail the signed-in member's email (you can't nominate yourself)
 */
export function validateInvite(form, ownEmail) {
  const email = form.email.trim().toLowerCase()
  /** @type {Record<string, string>} */
  const errors = {}
  if (!email) errors.email = 'Enter their email address.'
  else if (!EMAIL_RE.test(email)) errors.email = 'Enter a valid email address.'
  else if (email === ownEmail.trim().toLowerCase()) errors.email = "You can't nominate yourself. Choose someone you trust."
  if (!form.relationship) errors.relationship = 'Choose how they are related to you.'
  return { errors, values: { email, relationship: form.relationship } }
}

/**
 * Ready-to-send message for WhatsApp. Lefa doesn't send emails yet, so the
 * member lets their nominee know; the invitation appears once the nominee
 * signs up with this exact email.
 * @param {string} ownerName
 * @param {string} email
 * @param {string} origin e.g. https://lefa-nine.vercel.app
 */
export function shareMessage(ownerName, email, origin) {
  return (
    `Hi, it's ${ownerName}. I've chosen you as my trusted nominee on Lefa, so you can help claim my funeral and life cover if anything ever happens to me. ` +
    `You won't see any of my details unless a death is verified. ` +
    `Please sign up with this email (${email}) to accept: ${origin}/signup`
  )
}

/** @param {string} message */
export const whatsappLink = (message) => `https://wa.me/?text=${encodeURIComponent(message)}`
