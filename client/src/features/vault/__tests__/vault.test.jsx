import { screen, within } from '@testing-library/react'
import { renderApp } from '../../../test-utils/renderApp.jsx'
import { createFakeApi } from '../../../test-utils/fakeApi.js'

const THANDI_POLICIES = [
  { insurer: 'Old Mutual', policy_number: 'OM-104821', type: 'funeral', cover_amount: 30000, monthly_premium: 199, debit_day: 25, status: 'active', beneficiaries: 'Lerato Mokoena (daughter)' },
  { insurer: 'Sanlam', policy_number: 'SL-550219', type: 'life', cover_amount: 55000, monthly_premium: 288, debit_day: 1, status: 'active' },
  { insurer: 'Clientele', policy_number: 'CL-77310', type: 'funeral', cover_amount: 10000, monthly_premium: 99, debit_day: 15, status: 'lapsed', notes: 'Lapsed in March.' },
]

const thandisVault = () => createFakeApi({ policies: THANDI_POLICIES })

/** Fill the policy form. Only the fields given are typed. */
async function fillForm(/** @type {any} */ user, /** @type {Record<string, string>} */ fields) {
  const dialog = within(screen.getByRole('dialog'))
  const labels = {
    insurer: /Insurer/,
    policy_number: /Policy number/,
    cover_amount: /Cover amount/,
    monthly_premium: /Monthly premium/,
    debit_day: /Debit day/,
  }
  for (const [key, value] of Object.entries(fields)) {
    const input = dialog.getByLabelText(labels[/** @type {keyof typeof labels} */ (key)])
    await user.clear(input)
    if (value) await user.type(input, value)
  }
}

describe('My Vault (S3)', () => {
  test('shows totals from the API: active cover and premiums exclude the lapsed policy', async () => {
    renderApp('/vault', { api: thandisVault() })
    expect(await screen.findByRole('heading', { name: 'Dumela, Thandi' })).toBeInTheDocument()
    const totals = within(await screen.findByRole('region', { name: 'Vault totals' }))
    expect(await totals.findByText('R85 000')).toBeInTheDocument()
    expect(totals.getByText('R487')).toBeInTheDocument()
    expect(totals.getByText('Claim-ready docs')).toBeInTheDocument()
    expect(totals.getByText('0 of 9')).toBeInTheDocument()
    expect(totals.getByText('across 2 insurers')).toBeInTheDocument()
  })

  test('lists a card per policy with a masked number, cover and debit schedule', async () => {
    renderApp('/vault', { api: thandisVault() })
    const card = within(await screen.findByRole('article', { name: 'Old Mutual' }))
    expect(card.getByText('•••• 4821')).toBeInTheDocument()
    expect(card.queryByText('OM-104821')).not.toBeInTheDocument()
    expect(card.getByText('R30 000')).toBeInTheDocument()
    expect(card.getByText('R199 · debits on the 25th')).toBeInTheDocument()
    expect(card.getByText('Funeral')).toBeInTheDocument()
    expect(card.getByText('Active')).toBeInTheDocument()
    expect(card.getByRole('link', { name: 'View policy for Old Mutual' })).toHaveAttribute('href', '/vault/policies/p1')
  })

  test('warns about lapsed policies, because they will not pay out', async () => {
    renderApp('/vault', { api: thandisVault() })
    const warning = await screen.findByRole('note', { name: 'Lapsed policies' })
    expect(warning).toHaveTextContent('Clientele')
    expect(warning).toHaveTextContent(/won't pay out/)
  })

  test('filter chips narrow the list by policy type', async () => {
    const { user } = renderApp('/vault', { api: thandisVault() })
    await screen.findByRole('article', { name: 'Sanlam' })
    await user.click(screen.getByRole('button', { name: 'Life (1)' }))
    expect(screen.getByRole('button', { name: 'Life (1)' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getAllByRole('article').map((a) => a.getAttribute('aria-label'))).toEqual(['Sanlam'])
    await user.click(screen.getByRole('button', { name: 'All (3)' }))
    expect(screen.getAllByRole('article')).toHaveLength(3)
  })

  test('an empty vault invites the member to add their first policy', async () => {
    const { user } = renderApp('/vault', { api: createFakeApi() })
    expect(await screen.findByRole('heading', { name: 'Add your first policy' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Add your first policy' }))
    expect(screen.getByRole('dialog', { name: 'Add a policy' })).toBeInTheDocument()
  })

  test('if the vault cannot load, the member can try again', async () => {
    renderApp('/vault', { api: createFakeApi({ failList: true }) })
    expect(await screen.findByRole('heading', { name: "We couldn't load your vault" })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })
})

describe('Add / edit policy (S4)', () => {
  test('validates before saving and does not call the API', async () => {
    const api = createFakeApi()
    const { user } = renderApp('/vault', { api })
    await user.click(await screen.findByRole('button', { name: 'Add your first policy' }))
    await fillForm(user, { cover_amount: '-5', debit_day: '40' })
    await user.click(screen.getByRole('button', { name: 'Save policy' }))
    const dialog = within(screen.getByRole('dialog'))
    expect(dialog.getByText('Insurer is required.')).toBeInTheDocument()
    expect(dialog.getByText('Policy number is required.')).toBeInTheDocument()
    expect(dialog.getByText(/Enter an amount in rand/)).toBeInTheDocument()
    expect(dialog.getByText('Debit day must be between 1 and 31.')).toBeInTheDocument()
    expect(api.calls.filter(([name]) => name === 'createPolicy')).toEqual([])
  })

  test('adds a policy: suggestion chip, type choice, rand amounts; totals refresh', async () => {
    const api = thandisVault()
    const { user } = renderApp('/vault', { api })
    await screen.findByText('R85 000')
    await user.click(screen.getByRole('button', { name: 'Add policy' }))
    const dialog = within(screen.getByRole('dialog', { name: 'Add a policy' }))
    await user.click(dialog.getByRole('button', { name: 'Hollard' }))
    await fillForm(user, { policy_number: 'HL-9', cover_amount: '15 000', monthly_premium: '75,25', debit_day: '7' })
    await user.click(dialog.getByRole('radio', { name: 'Credit life' }))
    await user.click(dialog.getByRole('button', { name: 'Save policy' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Hollard policy added')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(await screen.findByRole('article', { name: 'Hollard' })).toBeInTheDocument()
    expect(await screen.findByText('R100 000')).toBeInTheDocument()
    expect(api.calls.find(([name]) => name === 'createPolicy')?.[1]).toEqual({
      insurer: 'Hollard',
      policy_number: 'HL-9',
      type: 'credit_life',
      status: 'active',
      cover_amount: 15000,
      monthly_premium: 75.25,
      debit_day: 7,
      beneficiaries: '',
      notes: '',
    })
  })

  test('shows the server’s messages: duplicates and field errors', async () => {
    const { user } = renderApp('/vault', { api: thandisVault() })
    await user.click(await screen.findByRole('button', { name: 'Add policy' }))
    await fillForm(user, { insurer: 'Sanlam', policy_number: 'DUP' })
    await user.click(screen.getByRole('button', { name: 'Save policy' }))
    expect(await within(screen.getByRole('dialog')).findByRole('alert')).toHaveTextContent("You've already added this policy")

    await fillForm(user, { insurer: 'Server Says No', policy_number: 'X-1' })
    await user.click(screen.getByRole('button', { name: 'Save policy' }))
    expect(await within(screen.getByRole('dialog')).findByText('The server rejected this insurer.')).toBeInTheDocument()
  })

  test('Cancel closes without saving', async () => {
    const api = thandisVault()
    const { user } = renderApp('/vault', { api })
    await user.click(await screen.findByRole('button', { name: 'Add policy' }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(api.calls.some(([name]) => name === 'createPolicy')).toBe(false)
  })
})

describe('Policy detail (S5)', () => {
  test('shows the full details and the claim checklist', async () => {
    renderApp('/vault/policies/p1', { api: thandisVault() })
    expect(await screen.findByRole('heading', { level: 1, name: 'Old Mutual' })).toBeInTheDocument()
    const info = within(screen.getByRole('region', { name: 'Policy information' }))
    expect(info.getByText('OM-104821')).toBeInTheDocument()
    expect(info.getByText('R30 000')).toBeInTheDocument()
    expect(info.getByText('R199')).toBeInTheDocument()
    expect(info.getByText('25th of every month')).toBeInTheDocument()
    expect(info.getByText('Lerato Mokoena (daughter)')).toBeInTheDocument()
    const checklist = within(screen.getByRole('region', { name: 'Claim-ready checklist' }))
    expect(checklist.getByText('Certified ID copy')).toBeInTheDocument()
    expect(checklist.getByText('BI-1663 notice of death')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Back to My Vault/ })).toHaveAttribute('href', '/vault')
  })

  test('edit opens the form pre-filled and saves only through the API', async () => {
    const api = thandisVault()
    const { user } = renderApp('/vault/policies/p1', { api })
    await user.click(await screen.findByRole('button', { name: 'Edit policy' }))
    const dialog = within(screen.getByRole('dialog', { name: 'Edit policy' }))
    expect(dialog.getByLabelText(/Insurer/)).toHaveValue('Old Mutual')
    expect(dialog.getByLabelText(/Cover amount/)).toHaveValue('30000')
    await user.selectOptions(dialog.getByLabelText(/Status/), 'lapsed')
    await user.click(dialog.getByRole('button', { name: 'Save policy' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Old Mutual policy updated')
    expect(api.calls.find(([name]) => name === 'updatePolicy')?.[1]).toBe('p1')
    expect(await screen.findByRole('note', { name: 'Lapsed policy' })).toBeInTheDocument()
  })

  test('remove asks for confirmation, then returns to the vault', async () => {
    const api = thandisVault()
    const { user, router } = renderApp('/vault/policies/p3', { api })
    await user.click(await screen.findByRole('button', { name: 'Remove' }))
    const confirm = within(screen.getByRole('dialog', { name: 'Remove this policy?' }))
    expect(confirm.getByText(/Clientele/)).toBeInTheDocument()
    await user.click(confirm.getByRole('button', { name: 'Remove policy' }))
    expect(await screen.findByRole('heading', { name: 'Dumela, Thandi' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/vault')
    expect(api.rows().map((r) => r.insurer)).toEqual(['Old Mutual', 'Sanlam'])
  })

  test('a policy that does not exist (or belongs to someone else) shows not found', async () => {
    renderApp('/vault/policies/nope', { api: thandisVault() })
    expect(await screen.findByRole('heading', { name: "We couldn't find that policy" })).toBeInTheDocument()
  })
})
