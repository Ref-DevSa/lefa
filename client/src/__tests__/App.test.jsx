import { render, screen } from '@testing-library/react'
import App from '../App.jsx'

test('renders the Lefa name', () => {
  render(<App />)
  expect(screen.getByRole('heading', { name: 'Lefa' })).toBeInTheDocument()
})
