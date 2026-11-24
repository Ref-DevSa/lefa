import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeToggle } from '../ui/ThemeToggle.jsx'

afterEach(() => {
  delete document.documentElement.dataset.theme
  localStorage.clear()
})

test('switches to midnight and back, and remembers the choice', async () => {
  const user = userEvent.setup()
  render(<ThemeToggle />)
  const button = screen.getByRole('button', { name: 'Switch to dark mode' })
  await user.click(button)
  expect(document.documentElement.dataset.theme).toBe('dark')
  expect(localStorage.getItem('lefa-theme')).toBe('dark')
  expect(screen.getByRole('button', { name: 'Switch to light mode' })).toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: 'Switch to light mode' }))
  expect(document.documentElement.dataset.theme).toBeUndefined()
  expect(localStorage.getItem('lefa-theme')).toBe('light')
})

test('starts from the theme already applied to the page', () => {
  document.documentElement.dataset.theme = 'dark'
  render(<ThemeToggle />)
  expect(screen.getByRole('button', { name: 'Switch to light mode' })).toBeInTheDocument()
})
