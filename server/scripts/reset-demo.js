// Puts the live demo back to its starting point, so the "verify a death"
// moment can be shown again (rehearsals, the Loom recording, reviewers).
//
//   npm run db:reset-demo
//
// What it does, and nothing else:
//   * Jabulani Khumalo's death report goes back to 'pending'
//   * the claims created when it was verified are removed (with their history)
// Everything else (Thandi, Lerato, Mmabatho's paid claim, …) is left alone;
// run `npm run db:seed` to restore anything else to the demo defaults.
//
// Uses the local-only service_role key from server/.env.seed.

import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (server/.env.seed).')
  process.exit(1)
}
const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })

async function main() {
  const { data: jabu, error: who } = await db.from('profiles').select('id').eq('email', 'jabu@lefa.test').maybeSingle()
  if (who) throw who
  if (!jabu) throw new Error('Demo data not found. Run `npm run db:seed` first.')

  const { data: report, error: findErr } = await db
    .from('death_reports')
    .select('id, status')
    .eq('owner_id', jabu.id)
    .neq('status', 'rejected')
    .maybeSingle()
  if (findErr) throw findErr
  if (!report) throw new Error("Jabulani's death report is missing. Run `npm run db:seed`.")

  // Claims (and their events, by cascade) opened by this report.
  const { data: removed, error: claimsErr } = await db.from('claims').delete().eq('death_report_id', report.id).select('id')
  if (claimsErr) throw claimsErr

  // Any rejected attempts for Jabulani are cleared too, so the story is clean.
  const { error: rejErr } = await db.from('death_reports').delete().eq('owner_id', jabu.id).eq('status', 'rejected')
  if (rejErr) throw rejErr

  const { error: resetErr } = await db
    .from('death_reports')
    .update({ status: 'pending', reviewed_by: null, reviewed_at: null, rejection_reason: null })
    .eq('id', report.id)
  if (resetErr) throw resetErr

  console.log(`✓ Jabulani's report is pending again (was ${report.status}); removed ${removed?.length ?? 0} claim(s).`)
  console.log('  The broker can verify it again; Sipho sees "pending verification".')
}

main().catch((err) => {
  console.error('Reset failed:', err.message ?? err)
  process.exit(1)
})
