// Creates (or refreshes) the demo logins and their sample data (PRD §9).
//
//   npm run db:seed
//
// Needs server/.env.seed (gitignored) with SUPABASE_URL and
// SUPABASE_SERVICE_ROLE_KEY. The service_role key bypasses RLS, which is why
// it lives only in this local file and is never deployed or committed.
//
// Safe to run repeatedly: it only touches @lefa.test accounts and updates
// what's already there instead of duplicating it. Nominees, documents, death
// reports and claims are added here as those features land (#11–#13).

import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const password = process.env.SEED_PASSWORD || 'LefaDemo2026!'
// The anon key (from server/.env) lets the seed act as the broker when verifying
// the demo death report, exactly as the app does.
const anonKey = process.env.SUPABASE_ANON_KEY

if (!url || !serviceKey || !anonKey) {
  console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (server/.env.seed) or SUPABASE_ANON_KEY (server/.env).')
  process.exit(1)
}

const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })

/** @type {Array<{ key: string, email: string, full_name: string, phone: string, role: 'member' | 'broker' | 'admin' }>} */
const PEOPLE = [
  { key: 'thandi', email: 'thandi@lefa.test', full_name: 'Thandi Mokoena', phone: '+27820000001', role: 'member' },
  { key: 'lerato', email: 'lerato@lefa.test', full_name: 'Lerato Mokoena', phone: '+27820000002', role: 'member' },
  { key: 'sipho', email: 'sipho@lefa.test', full_name: 'Sipho Ndlovu', phone: '+27820000003', role: 'member' },
  { key: 'broker', email: 'broker@lefa.test', full_name: 'Naledi Dube', phone: '+27820000004', role: 'broker' },
  { key: 'admin', email: 'admin@lefa.test', full_name: 'Lefa Admin', phone: '+27820000005', role: 'admin' },
  // Not demo logins: the two people whose deaths Sipho reported.
  { key: 'mmabatho', email: 'mmabatho@lefa.test', full_name: 'Mmabatho Ndlovu', phone: '+27820000006', role: 'member' },
  { key: 'jabu', email: 'jabu@lefa.test', full_name: 'Jabulani Khumalo', phone: '+27820000007', role: 'member' },
]

/** Thandi's vault: R85 000 active cover, R487/month, plus one lapsed policy. */
const THANDI_POLICIES = [
  { insurer: 'Old Mutual', policy_number: 'OM-104821', type: 'funeral', cover_amount: 30000, monthly_premium: 199, debit_day: 25, status: 'active', beneficiaries: 'Lerato Mokoena (daughter)' },
  { insurer: 'Sanlam', policy_number: 'SL-550219', type: 'life', cover_amount: 55000, monthly_premium: 288, debit_day: 1, status: 'active', beneficiaries: 'Lerato Mokoena (daughter)' },
  { insurer: 'Clientele', policy_number: 'CL-77310', type: 'funeral', cover_amount: 10000, monthly_premium: 99, debit_day: 15, status: 'lapsed', notes: 'Lapsed in March: debit date clashed with pay day.' },
]

/** @param {string} email */
async function findUser(email) {
  for (let page = 1; ; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw error
    const hit = data.users.find((u) => u.email === email)
    if (hit || data.users.length < 200) return hit
  }
}

/** @param {(typeof PEOPLE)[number]} person */
async function upsertPerson(person) {
  const metadata = { full_name: person.full_name, phone: person.phone }
  const existing = await findUser(person.email)
  let id
  if (existing) {
    const { error } = await db.auth.admin.updateUserById(existing.id, { password, user_metadata: metadata, email_confirm: true })
    if (error) throw error
    id = existing.id
  } else {
    // The sign-up trigger creates the profile (always as 'member').
    const { data, error } = await db.auth.admin.createUser({ email: person.email, password, email_confirm: true, user_metadata: metadata })
    if (error) throw error
    id = data.user.id
  }
  // Roles can only be set server-side; the service role is allowed to.
  const { error } = await db.from('profiles').update({ role: person.role, full_name: person.full_name, phone: person.phone }).eq('id', id)
  if (error) throw error
  return id
}

async function main() {
  console.log(`Seeding ${url}`)
  /** @type {Record<string, string>} */
  const ids = {}
  for (const person of PEOPLE) {
    ids[person.key] = await upsertPerson(person)
    console.log(`  ✓ ${person.role.padEnd(6)} ${person.email}`)
  }

  const rows = THANDI_POLICIES.map((p) => ({ beneficiaries: '', notes: '', ...p, owner_id: ids.thandi }))
  const { data: policies, error } = await db
    .from('policies')
    .upsert(rows, { onConflict: 'owner_id,insurer,policy_number' })
    .select('id, insurer')
  if (error) throw error
  console.log(`  ✓ ${rows.length} policies for Thandi`)

  await seedDocuments(ids.thandi, policies)

  // Lerato is Thandi's accepted nominee: vault locked until a death is verified.
  const nominee = await db
    .from('nominees')
    .upsert(
      { owner_id: ids.thandi, nominee_email: 'lerato@lefa.test', nominee_id: ids.lerato, relationship: 'child', status: 'accepted' },
      { onConflict: 'owner_id,nominee_email' },
    )
  if (nominee.error) throw nominee.error
  console.log('  ✓ Lerato is Thandi’s nominee (accepted, vault locked)')

  await seedUnlockStory(ids)

  console.log(`Done. All demo logins use the password: ${password}`)
}

/**
 * A tiny, valid one-page PDF that says plainly it's a demo file, so nobody
 * mistakes seed data for a real ID or bank letter.
 * @param {string} title
 */
function demoPdf(title) {
  const text = `DEMO DOCUMENT - ${title} - not a real document`.replace(/[()\\]/g, '')
  const stream = `BT /F1 16 Tf 60 760 Td (${text}) Tj ET`
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ]
  let pdf = '%PDF-1.4\n'
  const offsets = objects.map((body, i) => {
    const at = pdf.length
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`
    return at
  })
  const xref = pdf.length
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  pdf += offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  return Buffer.from(pdf, 'latin1')
}

/**
 * Thandi's claim documents: ID and bank letter (count for every policy) and
 * the Old Mutual schedule, so the demo vault shows 7 of 9 ready.
 * @param {string} ownerId
 * @param {Array<{ id: string, insurer: string }>} policies
 */
async function seedDocuments(ownerId, policies) {
  const oldMutual = policies.find((p) => p.insurer === 'Old Mutual')
  const docs = [
    { doc_type: 'certified_id', file_name: 'Thandi Mokoena - certified ID.pdf', slug: 'certified-id', policy_id: null },
    { doc_type: 'bank_letter', file_name: 'Bank confirmation letter.pdf', slug: 'bank-letter', policy_id: null },
    { doc_type: 'policy_schedule', file_name: 'Old Mutual policy schedule.pdf', slug: 'old-mutual-schedule', policy_id: oldMutual?.id ?? null },
  ]
  for (const d of docs) {
    const file = demoPdf(d.file_name)
    const path = `${ownerId}/seed-${d.slug}.pdf` // fixed path, so re-running updates instead of duplicating
    const stored = await db.storage.from('vault').upload(path, file, { contentType: 'application/pdf', upsert: true })
    if (stored.error) throw stored.error
    const { error } = await db.from('documents').upsert(
      {
        owner_id: ownerId,
        policy_id: d.policy_id,
        doc_type: d.doc_type,
        file_name: d.file_name,
        storage_path: path,
        mime_type: 'application/pdf',
        size_bytes: file.length,
      },
      { onConflict: 'storage_path' },
    )
    if (error) throw error
  }
  console.log(`  ✓ ${docs.length} demo documents for Thandi (7 of 9 claim-ready)`)
}

/**
 * Sipho's story (PRD §9): his grandmother Mmabatho has died and her death is
 * verified, so her vault is unlocked with claims in progress; his father
 * Jabulani's death is reported and waiting for the broker.
 * The broker verifies through the real verify_death_report() function.
 * @param {Record<string, string>} ids
 */
async function seedUnlockStory(ids) {
  // Naledi (broker) looks after every demo family.
  const links = ['thandi', 'lerato', 'sipho', 'mmabatho', 'jabu'].map((k) => ({ broker_id: ids.broker, client_id: ids[k] }))
  const linked = await db.from('broker_clients').upsert(links, { onConflict: 'broker_id,client_id' })
  if (linked.error) throw linked.error
  console.log(`  ✓ broker linked to ${links.length} clients`)

  /** @param {string} owner @param {Array<Record<string, any>>} rows */
  const policiesFor = async (owner, rows) => {
    const { error } = await db
      .from('policies')
      .upsert(rows.map((p) => ({ beneficiaries: '', notes: '', ...p, owner_id: owner })), { onConflict: 'owner_id,insurer,policy_number' })
    if (error) throw error
  }
  await policiesFor(ids.mmabatho, [
    { insurer: 'AVBOB', policy_number: 'AV-220417', type: 'funeral', cover_amount: 15000, monthly_premium: 120, debit_day: 7, status: 'active', beneficiaries: 'Sipho Ndlovu (grandson)' },
    { insurer: 'Assupol', policy_number: 'AS-99812', type: 'funeral', cover_amount: 20000, monthly_premium: 165, debit_day: 25, status: 'active', beneficiaries: 'Sipho Ndlovu (grandson)' },
  ])
  await policiesFor(ids.jabu, [
    { insurer: 'Sanlam', policy_number: 'SL-781104', type: 'life', cover_amount: 60000, monthly_premium: 310, debit_day: 1, status: 'active', beneficiaries: 'Sipho Ndlovu (son)' },
  ])

  /** @param {string} owner @param {string} relationship */
  const nominate = async (owner, relationship) => {
    const r = await db.from('nominees').upsert(
      { owner_id: owner, nominee_email: 'sipho@lefa.test', nominee_id: ids.sipho, relationship, status: 'accepted' },
      { onConflict: 'owner_id,nominee_email' },
    )
    if (r.error) throw r.error
  }
  await nominate(ids.mmabatho, 'other')
  await nominate(ids.jabu, 'parent')

  /**
   * Death report with a DEMO certificate, filed by Sipho.
   * @param {string} owner @param {number} daysAgo @param {string} dha
   */
  const report = async (owner, daysAgo, dha) => {
    const existing = await db.from('death_reports').select('id, status').eq('owner_id', owner).neq('status', 'rejected').maybeSingle()
    if (existing.error) throw existing.error
    if (existing.data) return existing.data
    const path = `${owner}/seed-death-certificate.pdf`
    const up = await db.storage.from('death-certificates').upload(path, demoPdf('Death certificate'), { contentType: 'application/pdf', upsert: true })
    if (up.error) throw up.error
    const date = new Date(Date.now() - daysAgo * 86400000).toISOString().slice(0, 10)
    const { data, error } = await db
      .from('death_reports')
      .insert({ owner_id: owner, reported_by: ids.sipho, date_of_death: date, certificate_path: path, dha_reference: dha })
      .select('id, status')
      .single()
    if (error) throw error
    return data
  }
  const mmabathoReport = await report(ids.mmabatho, 12, 'BI-1663 0451200')
  await report(ids.jabu, 3, 'BI-1663 0457731')
  console.log('  ✓ death reports filed by Sipho (Mmabatho, Jabulani)')

  // Verify Mmabatho's as the broker, through the same function the app uses.
  if (mmabathoReport.status !== 'pending') {
    console.log('  ✓ Mmabatho’s death already verified')
    return
  }
  const broker = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const signedIn = await broker.auth.signInWithPassword({ email: 'broker@lefa.test', password })
  if (signedIn.error) throw signedIn.error
  const verified = await broker.rpc('verify_death_report', { report_id: mmabathoReport.id })
  if (verified.error) throw verified.error
  const { data: claims, error } = await broker.from('claims').select('id, policy_id, policies(insurer)').eq('death_report_id', mmabathoReport.id)
  if (error) throw error
  /** @type {Record<string, string>} */
  const byInsurer = {}
  for (const c of claims) byInsurer[/** @type {any} */ (c.policies).insurer] = c.id
  const steps = [
    ['AVBOB', 'submitted', 'Claim pack submitted at the AVBOB branch'],
    ['AVBOB', 'approved', 'AVBOB approved the claim'],
    ['AVBOB', 'paid', 'R15 000 paid into Sipho’s account'],
    ['Assupol', 'submitted', 'Submitted by email with certified copies'],
  ]
  for (const [insurer, status, note] of steps) {
    const r = await broker.rpc('update_claim_status', { claim_id: byInsurer[insurer], new_status: status, note })
    if (r.error) throw r.error
  }
  await broker.auth.signOut()
  console.log(`  ✓ broker verified Mmabatho’s death: ${verified.data} claims (AVBOB paid, Assupol submitted)`)
}

main().catch((err) => {
  console.error('Seed failed:', err.message ?? err)
  process.exit(1)
})
