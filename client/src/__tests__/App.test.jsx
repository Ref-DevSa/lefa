import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { routes } from '../app/routes.jsx'

function renderAt(path) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(<RouterProvider router={router} />)
  return router
}

describe('landing page (S1)', () => {
  test('shows the headline and both calls to action', () => {
    renderAt('/')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Every policy. One vault. Claim-ready for the people you love.',
    )
    expect(screen.getByRole('link', { name: 'Start your free vault' })).toHaveAttribute('href', '/signup')
    expect(screen.getByRole('link', { name: "I'm a broker" })).toHaveAttribute('href', '/signup?as=broker')
  })

  test('lists the five how-it-works steps in order', () => {
    renderAt('/')
    const section = screen.getByRole('region', { name: 'How it works' })
    const steps = within(section).getAllByRole('heading', { level: 3 }).map((h) => h.textContent)
    expect(steps).toEqual(['Record', 'Prepare', 'Nominate', 'Unlock', 'Claim & track'])
  })

  test('shows the three pricing plans', () => {
    renderAt('/')
    const pricing = within(screen.getByRole('region', { name: 'Pricing' }))
    expect(pricing.getByRole('heading', { name: 'Free' })).toBeInTheDocument()
    expect(pricing.getByRole('heading', { name: /Family Plus/ })).toBeInTheDocument()
    expect(pricing.getByRole('heading', { name: 'Brokers' })).toBeInTheDocument()
    expect(pricing.getByText('R29')).toBeInTheDocument()
  })

  test('has log in and sign up links in the nav', () => {
    renderAt('/')
    const nav = within(screen.getByRole('navigation', { name: 'Main' }))
    expect(nav.getByRole('link', { name: 'Log in' })).toHaveAttribute('href', '/login')
    expect(nav.getByRole('link', { name: 'Sign up' })).toHaveAttribute('href', '/signup')
  })
})

describe('system states (S14)', () => {
  test('unknown routes show the 404 page, with a way home', async () => {
    const router = renderAt('/does-not-exist')
    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('link', { name: 'Back to home' }))
    expect(router.state.location.pathname).toBe('/')
  })

  test('/403 shows the no-access page linking to the vault', () => {
    renderAt('/403')
    expect(screen.getByRole('heading', { name: "You don't have access to this page" })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Go to my vault' })).toHaveAttribute('href', '/vault')
  })

  test('a crashing route shows the friendly error page', () => {
    /** @returns {React.ReactNode} */
    function Boom() {
      throw new Error('boom')
    }
    jest.spyOn(console, 'error').mockImplementation(() => {})
    jest.spyOn(console, 'warn').mockImplementation(() => {})
    /** @type {import('react-router').RouteObject[]} */
    const crashing = [{ path: '/', errorElement: routes[0].errorElement, children: [{ index: true, element: <Boom /> }] }]
    render(<RouterProvider router={createMemoryRouter(crashing)} />)
    expect(screen.getByRole('heading', { name: 'Something went wrong' })).toBeInTheDocument()
    jest.restoreAllMocks()
  })
})
