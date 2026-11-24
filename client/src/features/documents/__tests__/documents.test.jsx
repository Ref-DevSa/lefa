import { fireEvent, screen, within } from '@testing-library/react'
import { renderApp } from '../../../test-utils/renderApp.jsx'
import { createFakeApi } from '../../../test-utils/fakeApi.js'

const POLICIES = [
  { id: 'om', insurer: 'Old Mutual', policy_number: 'OM-104821', type: 'funeral', cover_amount: 30000, monthly_premium: 199, debit_day: 25 },
  { id: 'sl', insurer: 'Sanlam', policy_number: 'SL-550219', type: 'life', cover_amount: 55000, monthly_premium: 288, debit_day: 1 },
]
const DOCS = [
  { doc_type: 'certified_id', file_name: 'Thandi ID.pdf', policy_id: null },
  { doc_type: 'policy_schedule', file_name: 'OM schedule.pdf', policy_id: 'om' },
]

const vault = (extra = {}) => createFakeApi({ policies: POLICIES, documents: DOCS, ...extra })
const pdf = (name = 'bank letter.pdf', size = 2048) => new File([new Uint8Array(size)], name, { type: 'application/pdf' })

describe('Documents page (S6)', () => {
  test('lists documents with type, linked policy and size, marked private', async () => {
    renderApp('/documents', { api: vault() })
    expect(await screen.findByRole('heading', { level: 1, name: 'Documents' })).toBeInTheDocument()
    expect(screen.getByText(/Private/)).toBeInTheDocument()
    const row = within(await screen.findByRole('listitem', { name: 'OM schedule.pdf' }))
    expect(row.getByText('Policy schedule')).toBeInTheDocument()
    expect(row.getByText('Old Mutual')).toBeInTheDocument()
    expect(row.getByText('117 KB')).toBeInTheDocument()
  })

  test('uploads a file with a type and a linked policy, then shows it', async () => {
    const api = vault()
    const { user } = renderApp('/documents', { api })
    const form = within(await screen.findByRole('form', { name: 'Upload a document' }))
    await user.upload(form.getByLabelText(/Choose a file/), pdf())
    expect(form.getByText('bank letter.pdf')).toBeInTheDocument()
    await user.selectOptions(form.getByLabelText('Document type'), 'bank_letter')
    await user.selectOptions(form.getByLabelText(/Link to a policy/), 'sl')
    await user.click(form.getByRole('button', { name: 'Upload' }))

    expect(await screen.findByRole('status')).toHaveTextContent('bank letter.pdf uploaded')
    expect(await screen.findByRole('listitem', { name: 'bank letter.pdf' })).toBeInTheDocument()
    expect(api.calls.find(([n]) => n === 'uploadDocument')?.[1]).toEqual({ name: 'bank letter.pdf', doc_type: 'bank_letter', policy_id: 'sl' })
  })

  test('refuses a file that is not a PDF, JPG or PNG', async () => {
    const api = vault()
    renderApp('/documents', { api })
    const form = within(await screen.findByRole('form', { name: 'Upload a document' }))
    // fireEvent (not user.upload) because the file picker's "accept" filter would hide it.
    fireEvent.change(form.getByLabelText(/Choose a file/), {
      target: { files: [new File(['x'], 'notes.docx', { type: 'application/msword' })] },
    })
    expect(await form.findByText('Upload a PDF, JPG or PNG file.')).toBeInTheDocument()
    expect(form.getByRole('button', { name: 'Upload' })).toBeDisabled()
    expect(api.calls.some(([n]) => n === 'uploadDocument')).toBe(false)
  })

  test('refuses files over 5 MB before uploading', async () => {
    const api = vault()
    const { user } = renderApp('/documents', { api })
    const form = within(await screen.findByRole('form', { name: 'Upload a document' }))
    await user.upload(form.getByLabelText(/Choose a file/), pdf('huge scan.pdf', 6 * 1024 * 1024))
    expect(await form.findByText(/This file is 6 MB/)).toBeInTheDocument()
    expect(form.getByRole('button', { name: 'Upload' })).toBeDisabled()
    expect(api.calls.some(([n]) => n === 'uploadDocument')).toBe(false)
  })

  test('shows the server’s message if it refuses the file', async () => {
    const { user } = renderApp('/documents', { api: vault() })
    const form = within(await screen.findByRole('form', { name: 'Upload a document' }))
    await user.upload(form.getByLabelText(/Choose a file/), new File(['x'], 'fake.bad', { type: 'application/pdf' }))
    await user.selectOptions(form.getByLabelText('Document type'), 'other')
    await user.click(form.getByRole('button', { name: 'Upload' }))
    expect(await form.findByRole('alert')).toHaveTextContent('Upload a PDF, JPG or PNG file.')
  })

  test('filter chips narrow the list by type', async () => {
    const { user } = renderApp('/documents', { api: vault() })
    await screen.findByRole('listitem', { name: 'Thandi ID.pdf' })
    await user.click(screen.getByRole('button', { name: 'Certified ID copy (1)' }))
    expect(screen.queryByRole('listitem', { name: 'OM schedule.pdf' })).not.toBeInTheDocument()
    expect(screen.getByRole('listitem', { name: 'Thandi ID.pdf' })).toBeInTheDocument()
  })

  test('View opens a short-lived link in a new tab', async () => {
    const tab = { location: { href: '' }, close: jest.fn(), opener: {} }
    const open = jest.spyOn(window, 'open').mockReturnValue(/** @type {any} */ (tab))
    const { user } = renderApp('/documents', { api: vault() })
    const row = within(await screen.findByRole('listitem', { name: 'Thandi ID.pdf' }))
    await user.click(row.getByRole('button', { name: 'View Thandi ID.pdf' }))
    expect(open).toHaveBeenCalledWith('', '_blank')
    await screen.findByRole('listitem', { name: 'Thandi ID.pdf' })
    expect(tab.location.href).toBe('https://storage.test/d1?token=signed')
    open.mockRestore()
  })

  test('Delete asks first, then removes the document', async () => {
    const api = vault()
    const { user } = renderApp('/documents', { api })
    const row = within(await screen.findByRole('listitem', { name: 'Thandi ID.pdf' }))
    await user.click(row.getByRole('button', { name: 'Delete Thandi ID.pdf' }))
    await user.click(within(screen.getByRole('dialog', { name: 'Delete this document?' })).getByRole('button', { name: 'Delete document' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Thandi ID.pdf deleted')
    expect(api.docs().map((d) => d.file_name)).toEqual(['OM schedule.pdf'])
  })

  test('an empty vault explains what to upload', async () => {
    renderApp('/documents', { api: createFakeApi({ policies: POLICIES }) })
    expect(await screen.findByRole('heading', { name: 'No documents yet' })).toBeInTheDocument()
  })
})

describe('Claim-ready checklist', () => {
  test('policy detail ticks what is uploaded and offers to upload the rest, pre-filled', async () => {
    const api = vault()
    const { user } = renderApp('/vault/policies/sl', { api })
    const checklist = within(await screen.findByRole('region', { name: 'Claim-ready checklist' }))
    expect(await checklist.findByText('1 of 3 ready')).toBeInTheDocument()
    expect(checklist.getByRole('listitem', { name: 'Certified ID copy: ready' })).toBeInTheDocument()
    expect(checklist.getByRole('listitem', { name: 'Policy schedule: missing' })).toBeInTheDocument()

    await user.click(checklist.getByRole('button', { name: 'Upload Policy schedule' }))
    const dialog = within(screen.getByRole('dialog', { name: 'Upload Policy schedule' }))
    expect(dialog.getByLabelText('Document type')).toHaveValue('policy_schedule')
    expect(dialog.getByLabelText(/Link to a policy/)).toHaveValue('sl')
    await user.upload(dialog.getByLabelText(/Choose a file/), pdf('Sanlam schedule.pdf'))
    await user.click(dialog.getByRole('button', { name: 'Upload' }))

    expect(await checklist.findByText('2 of 3 ready')).toBeInTheDocument()
    expect(checklist.getByRole('listitem', { name: 'Policy schedule: ready' })).toBeInTheDocument()
  })

  test('policy cards and the vault totals show readiness', async () => {
    renderApp('/vault', { api: vault() })
    const om = within(await screen.findByRole('article', { name: 'Old Mutual' }))
    expect(await om.findByText('2 of 3 docs')).toBeInTheDocument()
    const sl = within(screen.getByRole('article', { name: 'Sanlam' }))
    expect(sl.getByText('1 of 3 docs')).toBeInTheDocument()
    const totals = within(screen.getByRole('region', { name: 'Vault totals' }))
    expect(totals.getByText('3 of 6')).toBeInTheDocument()
  })
})
