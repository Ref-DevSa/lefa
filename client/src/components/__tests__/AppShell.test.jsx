import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { AppShell } from '../layout/AppShell.jsx'

const navItems = [
  { to: '/vault', label: 'My vault' },
  { to: '/documents', label: 'Documents' },
  { to: '/nominees', label: 'Nominees' },
]

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppShell navItems={navItems} actions={<button type="button">Log out</button>}>
        <p>Page body</p>
      </AppShell>
    </MemoryRouter>,
  )
}

test('renders desktop nav, mobile tabs, actions and content', () => {
  renderAt('/vault')
  const main = within(screen.getByRole('navigation', { name: 'Main' }))
  const tabs = within(screen.getByRole('navigation', { name: 'Tabs' }))
  for (const item of navItems) {
    expect(main.getByRole('link', { name: item.label })).toHaveAttribute('href', item.to)
    expect(tabs.getByRole('link', { name: item.label })).toHaveAttribute('href', item.to)
  }
  expect(screen.getByRole('button', { name: 'Log out' })).toBeInTheDocument()
  expect(screen.getByRole('main')).toHaveTextContent('Page body')
})

test('marks the current page in both navs', () => {
  renderAt('/documents')
  const current = screen.getAllByRole('link', { current: 'page' })
  expect(current).toHaveLength(2)
  current.forEach((link) => expect(link).toHaveTextContent('Documents'))
})

test('has a skip link to the main content', () => {
  renderAt('/vault')
  expect(screen.getByRole('link', { name: 'Skip to content' })).toHaveAttribute('href', '#main')
})
