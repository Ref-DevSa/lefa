import { z } from 'zod'

// Rules for a policy (PRD M2). The database enforces the same limits (see
// supabase/migrations/*_policies.sql); checking here too gives the form a
// clear message per field instead of a generic database error.

export const POLICY_TYPES = /** @type {const} */ (['funeral', 'life', 'credit_life', 'other'])
export const POLICY_STATUSES = /** @type {const} */ (['active', 'lapsed', 'paid_up'])

/** True when a rand amount has at most 2 decimals (whole cents). */
const isWholeCents = (/** @type {number} */ v) => Math.abs(v * 100 - Math.round(v * 100)) < 1e-6

/**
 * @param {string} label e.g. 'Cover amount'
 * @param {number} max
 */
const rands = (label, max) =>
  z
    .number({ error: `${label} must be a number in rand.` })
    .min(0, { error: `${label} must be R0 or more.` })
    .max(max, { error: `${label} looks too large. Check the amount.` })
    .refine(isWholeCents, { error: 'Use at most 2 decimal places (cents).' })

/**
 * @param {string} label
 * @param {number} max
 */
const requiredText = (label, max) =>
  z
    .string({ error: `${label} is required.` })
    .trim()
    .min(1, { error: `${label} is required.` })
    .max(max, { error: `${label} must be ${max} characters or fewer.` })

const fields = {
  insurer: requiredText('Insurer', 100),
  policy_number: requiredText('Policy number', 60),
  type: z.enum(POLICY_TYPES, { error: 'Choose funeral, life, credit life or other.' }),
  cover_amount: rands('Cover amount', 100_000_000),
  monthly_premium: rands('Monthly premium', 1_000_000),
  debit_day: z
    .number({ error: 'Debit day must be between 1 and 31.' })
    .int({ error: 'Debit day must be between 1 and 31.' })
    .min(1, { error: 'Debit day must be between 1 and 31.' })
    .max(31, { error: 'Debit day must be between 1 and 31.' })
    .nullable(),
  status: z.enum(POLICY_STATUSES, { error: 'Choose active, lapsed or paid-up.' }),
  beneficiaries: z.string().trim().max(500, { error: 'Beneficiaries must be 500 characters or fewer.' }),
  notes: z.string().trim().max(1000, { error: 'Notes must be 1000 characters or fewer.' }),
}

/**
 * New policy: insurer and policy number required, everything else optional
 * (the database fills in defaults). Unknown keys such as `owner_id` are
 * rejected: the owner is always the logged-in user.
 */
export const createPolicySchema = z.strictObject({
  ...fields,
  type: fields.type.optional(),
  cover_amount: fields.cover_amount.optional(),
  monthly_premium: fields.monthly_premium.optional(),
  debit_day: fields.debit_day.optional(),
  status: fields.status.optional(),
  beneficiaries: fields.beneficiaries.optional(),
  notes: fields.notes.optional(),
})

/** Edit: any subset of fields, but at least one. */
export const updatePolicySchema = z
  .strictObject(fields)
  .partial()
  .refine((v) => Object.keys(v).length > 0, { error: 'Nothing to update.' })
