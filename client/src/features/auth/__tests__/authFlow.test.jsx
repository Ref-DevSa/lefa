import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { routes } from '../../../app/routes.jsx'
import { AuthProvider } from '../AuthProvider.jsx'
import { createFakeSupabase } from '../../../test-utils/fakeSupabase.js'

const thandi = { email: 'thandi@lefa.test', password: 'Vault2026!', full_name: 'Thandi Mokoena', phone: '+27820000001', role: /** @type {const} */ ('member') }
const naledi = { email: 'naledi@lefa.test', password: 'Broker2026!', full_name: 'Naledi Dube', phone: null, role: /** @type {const} */ ('broker') }

/**
 * @param {string} path
 * @param {Parameters<typeof createFakeSupabase>[0]} [options]
 */
function renderApp(path, options = { users: [thandi, naledi] }) {
  const client = createFakeSupabase(options)
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(
    <AuthProvider client={client}>
      <RouterProvider router={router} />
    </AuthProvider>,
  )
  return { client, router, user: userEvent.setup() }
}

describe('log in', () => {
  test('shows inline errors and does not call Supabase when fields are empty', async () => {
    const { client, user } = renderApp('/login')
    await user.click(await screen.findByRole('button', { name: 'Log in' }))
    expect(screen.getByText('Enter your email address.')).toBeInTheDocument()
    expect(screen.getByText('Enter your password.')).toBeInTheDocument()
    expect(screen.getByLabelText(/Email/)).toHaveAttribute('aria-invalid', 'true')
    expect(client.calls).toEqual([])
  })

  test('wrong password shows a friendly error', async () => {
    const { user } = renderApp('/login')
    await user.type(await screen.findByLabelText(/Email/), thandi.email)
    await user.type(screen.getByLabelText(/Password/), 'wrong-password')
    await user.click(screen.getByRole('button', { name: 'Log in' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Incorrect email or password.')
  })

  test('a member lands on My Vault', async () => {
    const { router, user } = renderApp('/login')
    await user.type(await screen.findByLabelText(/Email/), thandi.email)
    await user.type(screen.getByLabelText(/Password/), thandi.password)
    await user.click(screen.getByRole('button', { name: 'Log in' }))
    expect(await screen.findByRole('heading', { name: 'Dumela, Thandi' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/vault')
  })

  test('a broker lands on the broker dashboard', async () => {
    const { router, user } = renderApp('/login')
    await user.type(await screen.findByLabelText(/Email/), naledi.email)
    await user.type(screen.getByLabelText(/Password/), naledi.password)
    await user.click(screen.getByRole('button', { name: 'Log in' }))
    expect(await screen.findByRole('heading', { name: /Naledi/ })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/broker')
  })

  test('returns to the page the user originally asked for', async () => {
    const { router, user } = renderApp('/vault?tab=documents')
    expect(await screen.findByRole('heading', { name: 'Log in to your vault' })).toBeInTheDocument()
    await user.type(screen.getByLabelText(/Email/), thandi.email)
    await user.type(screen.getByLabelText(/Password/), thandi.password)
    await user.click(screen.getByRole('button', { name: 'Log in' }))
    await screen.findByRole('heading', { name: 'Dumela, Thandi' })
    expect(router.state.location.pathname + router.state.location.search).toBe('/vault?tab=documents')
  })

  test('an already signed-in user visiting /login goes straight to their home', async () => {
    const { router } = renderApp('/login', { users: [thandi], signedInAs: thandi.email })
    await screen.findByRole('heading', { name: 'Dumela, Thandi' })
    expect(router.state.location.pathname).toBe('/vault')
  })
})

describe('sign up', () => {
  test('validates every field before calling Supabase', async () => {
    const { client, user } = renderApp('/signup')
    await user.click(await screen.findByRole('button', { name: 'Create my vault' }))
    expect(screen.getByText('Enter your full name.')).toBeInTheDocument()
    expect(screen.getByText(/South African mobile number/)).toBeInTheDocument()
    expect(screen.getByText('Please agree to the privacy notice to continue.')).toBeInTheDocument()
    expect(client.calls).toEqual([])
  })

  test('creates a member account with name and phone, then opens the vault', async () => {
    const { client, router, user } = renderApp('/signup')
    await user.type(await screen.findByLabelText(/Full name/), 'Sipho Ndlovu')
    await user.type(screen.getByLabelText(/Email/), 'Sipho@Example.co.za')
    await user.type(screen.getByLabelText(/Phone/), '082 555 1234')
    await user.type(screen.getByLabelText(/^Password/), 'Lefa2026!')
    await user.click(screen.getByRole('checkbox', { name: /privacy notice/ }))
    await user.click(screen.getByRole('button', { name: 'Create my vault' }))

    expect(await screen.findByRole('heading', { name: 'Dumela, Sipho' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/vault')
    expect(client.calls[0]).toEqual([
      'signUp',
      { email: 'sipho@example.co.za', data: { full_name: 'Sipho Ndlovu', phone: '+27825551234' } },
    ])
  })

  test('the sign-up request never includes a role', async () => {
    const { client, user } = renderApp('/signup?as=broker')
    expect(await screen.findByText(/Broker accounts are activated by Lefa/)).toBeInTheDocument()
    await user.type(screen.getByLabelText(/Full name/), 'Broker Hopeful')
    await user.type(screen.getByLabelText(/Email/), 'hopeful@example.co.za')
    await user.type(screen.getByLabelText(/Phone/), '0825551234')
    await user.type(screen.getByLabelText(/^Password/), 'Lefa2026!')
    await user.click(screen.getByRole('checkbox', { name: /privacy notice/ }))
    await user.click(screen.getByRole('button', { name: 'Create my vault' }))
    await screen.findByRole('heading', { name: 'Dumela, Broker' })
    expect(client.calls[0][1].data).not.toHaveProperty('role')
  })

  test('an existing email shows a friendly error', async () => {
    const { user } = renderApp('/signup')
    await user.type(await screen.findByLabelText(/Full name/), 'Thandi Again')
    await user.type(screen.getByLabelText(/Email/), thandi.email)
    await user.type(screen.getByLabelText(/Phone/), '0820000001')
    await user.type(screen.getByLabelText(/^Password/), 'Lefa2026!')
    await user.click(screen.getByRole('checkbox', { name: /privacy notice/ }))
    await user.click(screen.getByRole('button', { name: 'Create my vault' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/already exists/)
  })
})

describe('route guards', () => {
  test('logged-out visitors are sent to log in', async () => {
    const { router } = renderApp('/broker')
    expect(await screen.findByRole('heading', { name: 'Log in to your vault' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/login')
  })

  test('a member opening the broker dashboard sees the 403 page with a link home', async () => {
    renderApp('/broker', { users: [thandi], signedInAs: thandi.email })
    expect(await screen.findByRole('heading', { name: "You don't have access to this page" })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Go to my vault' })).toHaveAttribute('href', '/vault')
  })

  test('a broker opening the member vault sees 403 with a link to their dashboard', async () => {
    renderApp('/vault', { users: [naledi], signedInAs: naledi.email })
    expect(await screen.findByRole('heading', { name: "You don't have access to this page" })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Go to my dashboard' })).toHaveAttribute('href', '/broker')
  })

  test('if the profile cannot be loaded, the user can retry', async () => {
    renderApp('/vault', { users: [thandi], signedInAs: thandi.email, profileError: true })
    expect(await screen.findByRole('heading', { name: "We couldn't load your account" })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })

  test('log out returns to the home page and locks the vault again', async () => {
    const { router, user } = renderApp('/vault', { users: [thandi], signedInAs: thandi.email })
    await user.click(await screen.findByRole('button', { name: 'Log out' }))
    await screen.findByRole('heading', { level: 1, name: /Every policy/ })
    expect(router.state.location.pathname).toBe('/')
    await act(() => router.navigate('/vault'))
    expect(await screen.findByRole('heading', { name: 'Log in to your vault' })).toBeInTheDocument()
  })
})
