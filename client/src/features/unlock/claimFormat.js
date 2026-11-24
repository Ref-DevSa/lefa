// Claim stages and summaries for the unlocked vault (PRD M5, S10).
import { CLAIM_STATUS } from '../../lib/claimStatus.js'

/** The normal path of a claim; 'rejected' can happen at any point. */
export const CLAIM_STEPS = ['not_started', 'submitted', 'documents_requested', 'approved', 'paid']

/** @param {string} status */
export const claimLabel = (status) => CLAIM_STATUS[/** @type {keyof typeof CLAIM_STATUS} */ (status)]?.label ?? status

/**
 * Each step of the stepper as done / current / upcoming.
 * @param {string} status
 */
export function stepState(status) {
  const at = CLAIM_STEPS.indexOf(status)
  return CLAIM_STEPS.map((step, i) => ({
    step,
    label: claimLabel(step),
    state: at === -1 ? 'upcoming' : i < at ? 'done' : i === at ? 'current' : 'upcoming',
  }))
}

/**
 * "2 claims · 1 paid", plus cover under claim and what has been paid.
 * @param {{ policies: Array<Record<string, any>>, claims: Array<Record<string, any>> }} vault
 */
export function claimSummary({ policies, claims }) {
  const cents = (/** @type {Record<string, any> | undefined} */ p) => Math.round(Number(p?.cover_amount ?? 0) * 100)
  const policyOf = (/** @type {Record<string, any>} */ c) => policies.find((p) => p.id === c.policy_id)
  const paid = claims.filter((c) => c.status === 'paid')
  return {
    claims: claims.length,
    paid: paid.length,
    totalCover: claims.reduce((sum, c) => sum + cents(policyOf(c)), 0) / 100,
    paidCover: paid.reduce((sum, c) => sum + cents(policyOf(c)), 0) / 100,
  }
}
