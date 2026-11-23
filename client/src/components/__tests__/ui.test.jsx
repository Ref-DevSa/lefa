import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import {
  Button,
  Card,
  EmptyState,
  Input,
  Modal,
  Select,
  StatTile,
  StatusPill,
  ToastProvider,
  useToast,
} from '../ui/index.js'

describe('Button', () => {
  test('calls onClick', async () => {
    const onClick = jest.fn()
    render(<Button onClick={onClick}>Save</Button>)
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  test('is disabled and busy while loading', async () => {
    const onClick = jest.fn()
    render(
      <Button loading onClick={onClick}>
        Save
      </Button>,
    )
    const btn = screen.getByRole('button', { name: 'Save' })
    expect(btn).toBeDisabled()
    expect(btn).toHaveAttribute('aria-busy', 'true')
    await userEvent.click(btn)
    expect(onClick).not.toHaveBeenCalled()
  })

  test('defaults to type="button" so it never submits forms by accident', () => {
    render(<Button>Go</Button>)
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button')
  })
})

describe('Input', () => {
  test('is labelled and shows helper text', () => {
    render(<Input id="email" label="Email" helper="We never share it" />)
    const input = screen.getByLabelText('Email')
    expect(input).toHaveAccessibleDescription('We never share it')
    expect(input).not.toHaveAttribute('aria-invalid')
  })

  test('shows the error instead of the helper and marks invalid', () => {
    render(<Input id="email" label="Email" helper="We never share it" error="Enter a valid email" />)
    const input = screen.getByLabelText('Email')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription('Enter a valid email')
    expect(screen.queryByText('We never share it')).not.toBeInTheDocument()
  })

  test('accepts typing', async () => {
    render(<Input id="name" label="Full name" />)
    await userEvent.type(screen.getByLabelText('Full name'), 'Thandi')
    expect(screen.getByLabelText('Full name')).toHaveValue('Thandi')
  })
})

describe('Select', () => {
  test('renders placeholder and options and changes value', async () => {
    render(
      <Select
        id="type"
        label="Policy type"
        placeholder="Choose a type"
        options={[
          { value: 'funeral', label: 'Funeral' },
          { value: 'life', label: 'Life' },
        ]}
      />,
    )
    const select = screen.getByLabelText('Policy type')
    expect(screen.getAllByRole('option')).toHaveLength(3)
    await userEvent.selectOptions(select, 'life')
    expect(select).toHaveValue('life')
  })
})

describe('Card and StatTile', () => {
  test('Card renders as the requested element', () => {
    render(<Card as="section" aria-label="Summary">Hi</Card>)
    expect(screen.getByRole('region', { name: 'Summary' })).toHaveTextContent('Hi')
  })

  test('StatTile shows label, value and hint', () => {
    render(<StatTile label="Total cover" value="R85 000" hint="3 policies" />)
    expect(screen.getByText('Total cover')).toBeInTheDocument()
    expect(screen.getByText('R85 000')).toBeInTheDocument()
    expect(screen.getByText('3 policies')).toBeInTheDocument()
  })
})

describe('StatusPill', () => {
  test.each([
    ['not_started', 'Not started'],
    ['submitted', 'Submitted'],
    ['documents_requested', 'Documents requested'],
    ['approved', 'Approved'],
    ['paid', 'Paid'],
    ['rejected', 'Rejected'],
  ])('%s → %s', (status, label) => {
    render(<StatusPill status={status} />)
    expect(screen.getByText(label)).toBeInTheDocument()
  })

  test('falls back to the raw value for unknown statuses', () => {
    render(<StatusPill status="mystery" />)
    expect(screen.getByText('mystery')).toBeInTheDocument()
  })
})

describe('EmptyState', () => {
  test('shows title, description and action', () => {
    render(
      <EmptyState
        title="No policies yet"
        description="Add your first policy"
        action={<Button>Add policy</Button>}
      />,
    )
    expect(screen.getByRole('heading', { name: 'No policies yet' })).toBeInTheDocument()
    expect(screen.getByText('Add your first policy')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add policy' })).toBeInTheDocument()
  })
})

describe('Modal', () => {
  function Harness() {
    const [open, setOpen] = useState(false)
    return (
      <>
        <Button onClick={() => setOpen(true)}>Open</Button>
        <Modal open={open} onClose={() => setOpen(false)} title="Remove policy?" footer={<Button onClick={() => setOpen(false)}>Cancel</Button>}>
          This can't be undone.
        </Modal>
      </>
    )
  }

  test('opens, moves focus inside, and closes on Escape returning focus', async () => {
    render(<Harness />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    const opener = screen.getByRole('button', { name: 'Open' })
    await userEvent.click(opener)
    const dialog = screen.getByRole('dialog', { name: 'Remove policy?' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus()

    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(opener).toHaveFocus()
  })

  test('closes on backdrop click', async () => {
    render(<Harness />)
    await userEvent.click(screen.getByRole('button', { name: 'Open' }))
    await userEvent.click(screen.getByTestId('modal-backdrop'))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

describe('Toast', () => {
  function Trigger() {
    const toast = useToast()
    return (
      <>
        <Button onClick={() => toast('Policy saved', 'success')}>Save</Button>
        <Button onClick={() => toast('Upload failed', 'error')}>Fail</Button>
      </>
    )
  }

  test('shows a status toast that auto-dismisses', async () => {
    jest.useFakeTimers()
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    render(
      <ToastProvider duration={1000}>
        <Trigger />
      </ToastProvider>,
    )
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(screen.getByRole('status')).toHaveTextContent('Policy saved')

    act(() => jest.advanceTimersByTime(1000))
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    jest.useRealTimers()
  })

  test('errors use role="alert" and can be dismissed', async () => {
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Fail' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Upload failed')
    await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  test('useToast outside the provider throws a clear error', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<Trigger />)).toThrow('useToast must be used inside <ToastProvider>')
    jest.mocked(console.error).mockRestore()
  })
})
