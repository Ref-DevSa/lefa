import { screen, within } from '@testing-library/react'
import { renderApp } from '../../../test-utils/renderApp.jsx'
import { createFakeApi } from '../../../test-utils/fakeApi.js'

const naledi = { email: 'broker@lefa.test', password: 'x', full_name: 'Naledi Dube', phone: null, role: /** @type {const} */ ('broker') }
const signedInBroker = { users: [naledi], signedInAs: naledi.email }
const R1 = '00000000-0000-4000-8000-00000000d0a2'

const pendingReport = {
  id: R1,
  owner_id: 'jabu',
  owner_name: 'Jabulani Khumalo',
  reporter_name: 'Sipho Ndlovu',
  relationship: 'parent',
  date_of_death: '2026-11-21',
  dha_reference: 'BI-1663 0457731',
  notes: 'He passed at home',
  status: 'pending',
  created_at: '2026-11-22T10:00:00Z',
  owner: { id: 'jabu', full_name: 'Jabulani Khumalo', phone: '+27820000007' },
  reporter: { id: 'sipho', full_name: 'Sipho Ndlovu', relationship: 'parent' },
  certificate: { url: 'https://storage.test/death-certificates/jabu/cert.pdf?token=signed', kind: 'pdf' },
  policies: [
    { id: 'p1', insurer: 'Sanlam', policy_number: 'SL-781104', type: 'life', cover_amount: 60000, status: 'active', will_claim: true },
    { id: 'p2', insurer: 'Clientele', policy_number: 'CL-1', type: 'funeral', cover_amount: 8000, status: 'lapsed', will_claim: false },
  ],
}

const broker = () =>
  createFakeApi({
    broker: {
      overview: { clients: 5, pending_reports: 1, open_claims: 1, paid_this_month: 15000 },
      activity: [{ id: 'e9', claim_id: 'c1', insurer: 'AVBOB', owner_name: 'Mmabatho Ndlovu', from_status: 'approved', to_status: 'paid', note: 'R15 000 paid', created_at: '2026-11-20T10:00:00Z' }],
      reports: [pendingReport],
      claims: [
        { id: 'c1', status: 'paid', insurer: 'AVBOB', policy_number: 'AV-1', cover_amount: 15000, owner_name: 'Mmabatho Ndlovu', created_at: '2026-11-13T10:00:00Z', updated_at: '2026-11-20T10:00:00Z' },
        { id: 'c2', status: 'submitted', insurer: 'Assupol', policy_number: 'AS-1', cover_amount: 20000, owner_name: 'Mmabatho Ndlovu', created_at: '2026-11-13T10:00:00Z', updated_at: '2026-11-14T10:00:00Z' },
      ],
      events: {
        c2: [
          { id: 'e1', from_status: null, to_status: 'not_started', note: 'Claim opened after the death was verified', created_at: '2026-11-13T10:00:00Z' },
          { id: 'e2', from_status: 'not_started', to_status: 'submitted', note: 'Submitted by email', created_at: '2026-11-14T10:00:00Z' },
        ],
      },
    },
  })

describe('Broker dashboard (S11)', () => {
  test('greets the broker and shows the four key numbers', async () => {
    renderApp('/broker', { supabase: signedInBroker, api: broker() })
    expect(await screen.findByRole('heading', { level: 1, name: /Naledi/ })).toBeInTheDocument()
    const kpis = within(await screen.findByRole('region', { name: 'Key numbers' }))
    expect(await kpis.findByText('5')).toBeInTheDocument()
    expect(kpis.getByText('Pending verifications')).toBeInTheDocument()
    expect(kpis.getByText('R15 000')).toBeInTheDocument()
  })

  test('lists pending death reports with a Review link', async () => {
    renderApp('/broker', { supabase: signedInBroker, api: broker() })
    const table = within(await screen.findByRole('table', { name: 'Pending death reports' }))
    const row = within(await table.findByRole('row', { name: /Jabulani Khumalo/ }))
    expect(row.getByText('Sipho Ndlovu (parent)')).toBeInTheDocument()
    expect(row.getByText('21 Nov 2026')).toBeInTheDocument()
    expect(row.getByRole('link', { name: 'Review report for Jabulani Khumalo' })).toHaveAttribute('href', `/broker/reports/${R1}`)
  })

  test('shows recent claim activity', async () => {
    renderApp('/broker', { supabase: signedInBroker, api: broker() })
    const feed = within(await screen.findByRole('region', { name: 'Recent claim activity' }))
    expect(await feed.findByText(/Mmabatho Ndlovu · AVBOB/)).toBeInTheDocument()
    expect(feed.getByText('R15 000 paid')).toBeInTheDocument()
  })

  test('members cannot open the broker dashboard', async () => {
    const member = { email: 'thandi@lefa.test', password: 'x', full_name: 'Thandi Mokoena', phone: null, role: /** @type {const} */ ('member') }
    renderApp('/broker/claims', { supabase: { users: [member], signedInAs: member.email }, api: broker() })
    expect(await screen.findByRole('heading', { name: "You don't have access to this page" })).toBeInTheDocument()
  })
})

describe('Verify a death report (S12)', () => {
  test('shows everything needed to decide, including which policies become claims', async () => {
    renderApp(`/broker/reports/${R1}`, { supabase: signedInBroker, api: broker() })
    expect(await screen.findByRole('heading', { level: 1, name: 'Death report: Jabulani Khumalo' })).toBeInTheDocument()
    const details = within(screen.getByRole('region', { name: 'Report details' }))
    expect(details.getByText('Sipho Ndlovu (parent)')).toBeInTheDocument()
    expect(details.getByText('BI-1663 0457731')).toBeInTheDocument()
    expect(details.getByText('He passed at home')).toBeInTheDocument()
    expect(details.getByText('21 Nov 2026')).toBeInTheDocument()
    const policies = within(screen.getByRole('region', { name: 'Policies' }))
    expect(policies.getByRole('listitem', { name: /Sanlam/ })).toHaveTextContent('Becomes a claim')
    expect(policies.getByRole('listitem', { name: /Clientele/ })).toHaveTextContent('Lapsed: no claim')
    expect(screen.getByTitle('Death certificate')).toHaveAttribute('src', pendingReport.certificate.url)
  })

  test('verify asks for confirmation, spelling out what will happen, then returns to the dashboard', async () => {
    const api = broker()
    const { user, router } = renderApp(`/broker/reports/${R1}`, { supabase: signedInBroker, api })
    await user.click(await screen.findByRole('button', { name: 'Verify & unlock vault' }))
    const dialog = within(screen.getByRole('dialog', { name: 'Verify this death?' }))
    expect(dialog.getByText(/give Sipho Ndlovu access to Jabulani Khumalo’s vault and create 1 claim/)).toBeInTheDocument()
    await user.click(dialog.getByRole('button', { name: 'Yes, verify' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Verified. 1 claim created')
    await screen.findByRole('heading', { level: 1, name: /Naledi/ })
    expect(router.state.location.pathname).toBe('/broker')
    expect(api.calls.some(([n, id]) => n === 'verifyReport' && id === R1)).toBe(true)
  })

  test('reject needs a reason', async () => {
    const api = broker()
    const { user } = renderApp(`/broker/reports/${R1}`, { supabase: signedInBroker, api })
    await user.click(await screen.findByRole('button', { name: 'Reject' }))
    const dialog = within(screen.getByRole('dialog', { name: 'Reject this report?' }))
    await user.click(dialog.getByRole('button', { name: 'Reject report' }))
    expect(dialog.getByText(/Tell the family why/)).toBeInTheDocument()
    await user.type(dialog.getByLabelText(/Reason/), 'The certificate is not readable')
    await user.click(dialog.getByRole('button', { name: 'Reject report' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Report rejected')
    expect(api.calls.find(([n]) => n === 'rejectReport')?.slice(1)).toEqual([R1, 'The certificate is not readable'])
  })
})

describe('Claims pipeline (S13)', () => {
  test('a column per status with each claim in its place', async () => {
    renderApp('/broker/claims', { supabase: signedInBroker, api: broker() })
    const submitted = within(await screen.findByRole('region', { name: 'Submitted (1)' }))
    expect(submitted.getByRole('button', { name: /Mmabatho Ndlovu · Assupol/ })).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Paid (1)' })).getByText('R15 000')).toBeInTheDocument()
  })

  test('opening a claim shows its timeline and lets the broker move it on', async () => {
    const api = broker()
    const { user } = renderApp('/broker/claims', { supabase: signedInBroker, api })
    await user.click(await screen.findByRole('button', { name: /Mmabatho Ndlovu · Assupol/ }))
    const dialog = within(screen.getByRole('dialog', { name: 'Assupol · Mmabatho Ndlovu' }))
    expect(await dialog.findByText('Submitted by email')).toBeInTheDocument()
    await user.selectOptions(dialog.getByLabelText('New status'), 'approved')
    await user.type(dialog.getByLabelText(/Note/), 'Assupol approved')
    await user.click(dialog.getByRole('button', { name: 'Update' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Assupol claim updated: Approved')
    expect(await within(await screen.findByRole('region', { name: 'Approved (1)' })).findByRole('button', { name: /Assupol/ })).toBeInTheDocument()
  })
})
