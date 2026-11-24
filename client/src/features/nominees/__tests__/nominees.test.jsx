import { screen, within } from '@testing-library/react'
import { renderApp } from '../../../test-utils/renderApp.jsx'
import { createFakeApi } from '../../../test-utils/fakeApi.js'
import { shareMessage, validateInvite } from '../nomineeFormat.js'

describe('nominee rules', () => {
  test('validateInvite checks email, relationship and self-nomination', () => {
    expect(validateInvite({ email: '', relationship: '' }, 'thandi@lefa.test').errors).toEqual({
      email: 'Enter their email address.',
      relationship: 'Choose how they are related to you.',
    })
    expect(validateInvite({ email: 'Thandi@Lefa.test ', relationship: 'other' }, 'thandi@lefa.test').errors.email).toMatch(/yourself/)
    expect(validateInvite({ email: ' Lerato@Lefa.TEST', relationship: 'child' }, 'thandi@lefa.test')).toEqual({
      errors: {},
      values: { email: 'lerato@lefa.test', relationship: 'child' },
    })
  })

  test('the share message tells them which email to sign up with, and promises privacy', () => {
    const msg = shareMessage('Thandi Mokoena', 'lerato@lefa.test', 'https://lefa.test')
    expect(msg).toContain('lerato@lefa.test')
    expect(msg).toContain('https://lefa.test/signup')
    expect(msg).toMatch(/won't see any of my details unless a death is verified/)
  })
})

describe('Nominees (S7)', () => {
  test('explains that nominees see nothing until a death is verified', async () => {
    renderApp('/nominees', { api: createFakeApi() })
    expect(await screen.findByRole('heading', { level: 1, name: 'Nominees' })).toBeInTheDocument()
    expect(screen.getByText(/see nothing until a death is verified/)).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'No nominees yet' })).toBeInTheDocument()
  })

  test('invites someone and offers a WhatsApp message to let them know', async () => {
    const api = createFakeApi()
    const { user } = renderApp('/nominees', { api })
    const form = within(await screen.findByRole('form', { name: 'Invite a nominee' }))
    await user.type(form.getByLabelText(/Their email/), 'Lerato@Lefa.test')
    await user.selectOptions(form.getByLabelText('Relationship'), 'child')
    await user.click(form.getByRole('button', { name: 'Send invite' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Invitation added for lerato@lefa.test')
    const row = within(await screen.findByRole('listitem', { name: 'lerato@lefa.test' }))
    expect(row.getByText('Invited')).toBeInTheDocument()
    expect(row.getByText('Child')).toBeInTheDocument()
    const share = row.getByRole('link', { name: /Share on WhatsApp/ })
    expect(share.getAttribute('href')).toMatch(/^https:\/\/wa\.me\/\?text=/)
    expect(decodeURIComponent(share.getAttribute('href') ?? '')).toContain('lerato@lefa.test')
    expect(api.calls.find(([n]) => n === 'inviteNominee')?.[1]).toEqual({ email: 'lerato@lefa.test', relationship: 'child' })
  })

  test('checks the form first and shows API errors like the 3-nominee limit', async () => {
    const api = createFakeApi()
    const { user } = renderApp('/nominees', { api })
    const form = within(await screen.findByRole('form', { name: 'Invite a nominee' }))
    await user.type(form.getByLabelText(/Their email/), 'thandi@lefa.test')
    await user.click(form.getByRole('button', { name: 'Send invite' }))
    expect(form.getByText(/can't nominate yourself/)).toBeInTheDocument()
    expect(form.getByText('Choose how they are related to you.')).toBeInTheDocument()
    expect(api.calls.some(([n]) => n === 'inviteNominee')).toBe(false)

    await user.clear(form.getByLabelText(/Their email/))
    await user.type(form.getByLabelText(/Their email/), 'limit@x.co')
    await user.selectOptions(form.getByLabelText('Relationship'), 'other')
    await user.click(form.getByRole('button', { name: 'Send invite' }))
    expect(await form.findByRole('alert')).toHaveTextContent('up to 3 nominees')
  })

  test('revoke asks first; a revoked nominee can be re-invited', async () => {
    const api = createFakeApi({ nominees: [{ nominee_email: 'lerato@lefa.test', relationship: 'child', status: 'accepted', nominee_id: 'u-lerato' }] })
    const { user } = renderApp('/nominees', { api })
    const row = within(await screen.findByRole('listitem', { name: 'lerato@lefa.test' }))
    expect(row.getByText('Accepted')).toBeInTheDocument()
    await user.click(row.getByRole('button', { name: 'Revoke lerato@lefa.test' }))
    const dialog = within(screen.getByRole('dialog', { name: 'Revoke this nominee?' }))
    expect(dialog.getByText(/will no longer be able to claim/)).toBeInTheDocument()
    await user.click(dialog.getByRole('button', { name: 'Revoke' }))
    expect(await row.findByText('Revoked')).toBeInTheDocument()
    await user.click(row.getByRole('button', { name: 'Re-invite lerato@lefa.test' }))
    expect(await row.findByText('Invited')).toBeInTheDocument()
  })
})

describe('Nominated for me (S8)', () => {
  const invite = { owner_id: 'u-thandi', owner_name: 'Thandi Mokoena', relationship: 'parent', status: 'invited' }

  test('shows the invitation with the policyholder’s name, and accepting keeps the vault locked', async () => {
    const api = createFakeApi({ nominations: [invite] })
    const { user } = renderApp('/nominated', { api })
    const card = within(await screen.findByRole('article', { name: 'Invitation from Thandi Mokoena' }))
    expect(card.getByText(/has nominated you as their trusted person/)).toBeInTheDocument()
    await user.click(card.getByRole('button', { name: 'Accept' }))

    expect(await screen.findByRole('status')).toHaveTextContent('You are now Thandi Mokoena’s nominee')
    const trusted = within(await screen.findByRole('article', { name: 'Thandi Mokoena' }))
    expect(trusted.getByText('Vault locked')).toBeInTheDocument()
    expect(trusted.getByText(/only after a death is verified/)).toBeInTheDocument()
    expect(trusted.queryByText(/R\d/)).not.toBeInTheDocument() // no amounts, ever
  })

  test('declining removes the invitation', async () => {
    const api = createFakeApi({ nominations: [invite] })
    const { user } = renderApp('/nominated', { api })
    const card = within(await screen.findByRole('article', { name: 'Invitation from Thandi Mokoena' }))
    await user.click(card.getByRole('button', { name: 'Decline' }))
    expect(await screen.findByRole('heading', { name: 'No one has nominated you yet' })).toBeInTheDocument()
    expect(api.calls.find(([n]) => n === 'updateNominee')?.slice(1)).toEqual(['m1', 'decline'])
  })
})

describe('My Vault nominee panel', () => {
  test('invites the member to nominate someone when they have no nominee', async () => {
    renderApp('/vault', { api: createFakeApi({ policies: [{ insurer: 'Old Mutual', policy_number: 'OM-1' }] }) })
    const panel = within(await screen.findByRole('region', { name: 'Your nominees' }))
    expect(await panel.findByRole('link', { name: 'Nominate someone you trust' })).toHaveAttribute('href', '/nominees')
  })

  test('shows who is nominated and their status', async () => {
    renderApp('/vault', {
      api: createFakeApi({
        policies: [{ insurer: 'Old Mutual', policy_number: 'OM-1' }],
        nominees: [{ nominee_email: 'lerato@lefa.test', relationship: 'child', status: 'accepted' }],
      }),
    })
    const panel = within(await screen.findByRole('region', { name: 'Your nominees' }))
    expect(await panel.findByText('lerato@lefa.test')).toBeInTheDocument()
    expect(panel.getByText(/Child · Accepted/)).toBeInTheDocument()
    expect(panel.getByText(/can't see your vault until a death is verified/)).toBeInTheDocument()
  })
})
