import { fireEvent, screen, within } from '@testing-library/react'
import { renderApp } from '../../../test-utils/renderApp.jsx'
import { createFakeApi } from '../../../test-utils/fakeApi.js'
import { claimSummary, stepState } from '../claimFormat.js'

const MMA = '00000000-0000-4000-8000-0000000000a1'
const JABU = '00000000-0000-4000-8000-0000000000a2'

const nominations = [
  { owner_id: MMA, owner_name: 'Mmabatho Ndlovu', relationship: 'other', status: 'accepted', vault: { state: 'unlocked', report_status: 'verified', rejection_reason: null } },
  { owner_id: JABU, owner_name: 'Jabulani Khumalo', relationship: 'parent', status: 'accepted', vault: { state: 'locked', report_status: null, rejection_reason: null } },
]

const vault = {
  owner: { id: MMA, full_name: 'Mmabatho Ndlovu' },
  report: { id: 'r1', status: 'verified', date_of_death: '2026-11-12', reviewed_at: '2026-11-13T09:00:00Z' },
  policies: [
    { id: 'p1', insurer: 'AVBOB', policy_number: 'AV-220417', type: 'funeral', cover_amount: 15000, status: 'active' },
    { id: 'p2', insurer: 'Assupol', policy_number: 'AS-99812', type: 'funeral', cover_amount: 20000, status: 'active' },
    { id: 'p3', insurer: 'Clientele', policy_number: 'CL-1', type: 'funeral', cover_amount: 5000, status: 'lapsed' },
  ],
  documents: [
    { id: 'd1', doc_type: 'certified_id', file_name: 'Mmabatho ID.pdf', policy_id: null, mime_type: 'application/pdf', size_bytes: 1000 },
    { id: 'd2', doc_type: 'policy_schedule', file_name: 'AVBOB schedule.pdf', policy_id: 'p1', mime_type: 'application/pdf', size_bytes: 1000 },
  ],
  claims: [
    {
      id: 'c1',
      policy_id: 'p1',
      status: 'paid',
      events: [
        { id: 'e1', from_status: null, to_status: 'not_started', note: 'Claim opened after the death was verified', created_at: '2026-11-13T09:00:00Z' },
        { id: 'e2', from_status: 'not_started', to_status: 'submitted', note: 'Submitted at the branch', created_at: '2026-11-14T09:00:00Z' },
        { id: 'e3', from_status: 'submitted', to_status: 'paid', note: 'R15 000 paid', created_at: '2026-11-20T09:00:00Z' },
      ],
    },
    { id: 'c2', policy_id: 'p2', status: 'submitted', events: [{ id: 'e4', from_status: null, to_status: 'not_started', note: '', created_at: '2026-11-13T09:00:00Z' }] },
  ],
}

const api = (extra = {}) => createFakeApi({ nominations, vaults: { [MMA]: vault }, ...extra })

describe('claim rules', () => {
  test('stepState marks done, current and upcoming steps', () => {
    expect(stepState('documents_requested').map((s) => s.state)).toEqual(['done', 'done', 'current', 'upcoming', 'upcoming'])
    expect(stepState('paid').map((s) => s.state)).toEqual(['done', 'done', 'done', 'done', 'current'])
  })
  test('claimSummary adds up cover under claim and what is paid', () => {
    expect(claimSummary(vault)).toEqual({ claims: 2, paid: 1, totalCover: 35000, paidCover: 15000 })
  })
})

describe('Nominated for me: vault states', () => {
  test('unlocked shows "Open vault"; locked offers "Report a death"', async () => {
    renderApp('/nominated', { api: api() })
    const mma = within(await screen.findByRole('article', { name: 'Mmabatho Ndlovu' }))
    expect(mma.getByText('Vault unlocked')).toBeInTheDocument()
    expect(mma.getByRole('link', { name: 'Open vault' })).toHaveAttribute('href', `/vaults/${MMA}`)
    const jabu = within(screen.getByRole('article', { name: 'Jabulani Khumalo' }))
    expect(jabu.getByText('Vault locked')).toBeInTheDocument()
    expect(jabu.getByRole('link', { name: 'Report a death' })).toHaveAttribute('href', `/nominated/${JABU}/report`)
  })

  test('a rejected report shows the broker’s reason and lets them report again', async () => {
    renderApp('/nominated', {
      api: api({ nominations: [{ ...nominations[1], vault: { state: 'rejected', report_status: 'rejected', rejection_reason: 'The certificate is not readable' } }] }),
    })
    const card = within(await screen.findByRole('article', { name: 'Jabulani Khumalo' }))
    expect(card.getByText(/The certificate is not readable/)).toBeInTheDocument()
    expect(card.getByRole('link', { name: 'Report again' })).toBeInTheDocument()
  })
})

describe('Report a death (S9)', () => {
  const certificate = () => new File([new Uint8Array(2048)], 'death certificate.pdf', { type: 'application/pdf' })

  test('a gentle form that files the report and confirms it is under review', async () => {
    const fake = api()
    const { user } = renderApp(`/nominated/${JABU}/report`, { api: fake })
    expect(await screen.findByRole('heading', { name: /We’re sorry for your loss/ })).toBeInTheDocument()
    expect(screen.getByText(/everything Jabulani was covered for/)).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/Date of death/), { target: { value: '2026-11-21' } })
    await user.upload(screen.getByLabelText(/Choose the death certificate/), certificate())
    await user.type(screen.getByLabelText(/DHA reference/), 'BI-1663 0457731')
    await user.click(screen.getByRole('button', { name: 'Submit report' }))

    expect(await screen.findByRole('heading', { name: 'Report submitted' })).toBeInTheDocument()
    expect(screen.getByText(/A broker will check the certificate/)).toBeInTheDocument()
    expect(fake.calls.find(([n]) => n === 'reportDeath')?.[1]).toEqual({
      ownerId: JABU,
      dateOfDeath: '2026-11-21',
      dhaReference: 'BI-1663 0457731',
      file: 'death certificate.pdf',
    })
  })

  test('needs a date and a certificate, and the date cannot be in the future', async () => {
    const fake = api()
    const { user } = renderApp(`/nominated/${JABU}/report`, { api: fake })
    await user.click(await screen.findByRole('button', { name: 'Submit report' }))
    expect(screen.getByText('Enter the date of death.')).toBeInTheDocument()
    expect(screen.getByText(/Attach the death certificate/)).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText(/Date of death/), { target: { value: '2999-01-01' } })
    await user.click(screen.getByRole('button', { name: 'Submit report' }))
    expect(screen.getByText('The date of death cannot be in the future.')).toBeInTheDocument()
    expect(fake.calls.some(([n]) => n === 'reportDeath')).toBe(false)
  })

  test('someone who did not nominate you cannot be reported from here', async () => {
    renderApp('/nominated/00000000-0000-4000-8000-0000000000ff/report', { api: api() })
    expect(await screen.findByRole('heading', { name: "You can't report this death" })).toBeInTheDocument()
  })
})

describe('Unlocked vault & claims (S10)', () => {
  test('shows the summary, a claim per policy with its stage, and the lapsed policy without a claim', async () => {
    renderApp(`/vaults/${MMA}`, { api: api() })
    expect(await screen.findByRole('heading', { level: 1, name: 'Mmabatho Ndlovu’s vault' })).toBeInTheDocument()
    expect(screen.getByText(/Verified 13 Nov 2026/)).toBeInTheDocument()
    const summary = within(screen.getByRole('region', { name: 'Claims summary' }))
    expect(summary.getByText('R35 000')).toBeInTheDocument()
    expect(summary.getByText('2 claims · 1 paid (R15 000)')).toBeInTheDocument()

    const avbob = within(screen.getByRole('article', { name: 'AVBOB claim' }))
    expect(avbob.getByText('AV-220417')).toBeInTheDocument()
    expect(avbob.getByRole('listitem', { name: 'Paid (current step)' })).toBeInTheDocument()
    expect(avbob.getByText('AVBOB schedule.pdf')).toBeInTheDocument()
    expect(avbob.getByText('Mmabatho ID.pdf')).toBeInTheDocument() // the ID counts for every claim

    const noClaim = within(screen.getByRole('region', { name: 'Policies without a claim' }))
    expect(noClaim.getByText(/Clientele/)).toBeInTheDocument()
    expect(noClaim.getByText(/lapsed/)).toBeInTheDocument()
  })

  test('the timeline shows every update', async () => {
    const { user } = renderApp(`/vaults/${MMA}`, { api: api() })
    const avbob = within(await screen.findByRole('article', { name: 'AVBOB claim' }))
    await user.click(avbob.getByRole('button', { name: 'Show history (3 updates)' }))
    expect(avbob.getByText('R15 000 paid')).toBeInTheDocument()
    expect(avbob.getByText('Submitted at the branch')).toBeInTheDocument()
  })

  test('the nominee updates a claim’s status with a note', async () => {
    const fake = api()
    const { user } = renderApp(`/vaults/${MMA}`, { api: fake })
    const assupol = within(await screen.findByRole('article', { name: 'Assupol claim' }))
    await user.click(assupol.getByRole('button', { name: 'Update status' }))
    await user.selectOptions(assupol.getByLabelText('New status'), 'documents_requested')
    await user.type(assupol.getByLabelText(/Note/), 'Assupol wants a bank letter')
    await user.click(assupol.getByRole('button', { name: 'Save' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Assupol claim updated: Documents requested')
    expect(await assupol.findByRole('listitem', { name: 'Documents requested (current step)' })).toBeInTheDocument()
    expect(fake.calls.find(([n]) => n === 'updateClaim')?.slice(1)).toEqual(['c2', { status: 'documents_requested', note: 'Assupol wants a bank letter' }])
  })

  test('a locked vault explains why instead of showing anything', async () => {
    renderApp(`/vaults/${JABU}`, { api: api() })
    expect(await screen.findByRole('heading', { name: 'This vault is still locked' })).toBeInTheDocument()
  })
})
