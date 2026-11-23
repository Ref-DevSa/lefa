import { normalizeSaPhone, validateLogin, validateSignup } from '../validation.js'
import { friendlyAuthError } from '../authErrors.js'
import { homeFor, safeRedirect } from '../roles.js'

describe('normalizeSaPhone', () => {
  test.each([
    ['82 123 4567', '+27821234567'],
    ['082 123 4567', '+27821234567'],
    ['+27 82 123 4567', '+27821234567'],
    ['27821234567', '+27821234567'],
    ['(082) 123-4567', '+27821234567'],
  ])('%s becomes %s', (input, expected) => {
    expect(normalizeSaPhone(input)).toBe(expected)
  })

  test.each(['', '12345', '0021234567', '+44 7700 900123', '082 123 45678'])('rejects %p', (input) => {
    expect(normalizeSaPhone(input)).toBeNull()
  })
})

describe('validateLogin', () => {
  test('requires email and password', () => {
    expect(validateLogin({ email: '', password: '' }).errors).toEqual({
      email: 'Enter your email address.',
      password: 'Enter your password.',
    })
  })

  test('rejects a malformed email', () => {
    expect(validateLogin({ email: 'thabo@', password: 'x' }).errors.email).toMatch(/valid email/)
  })

  test('trims and lower-cases the email', () => {
    const result = validateLogin({ email: '  Thabo@Example.co.za ', password: 'secret' })
    expect(result.errors).toEqual({})
    expect(result.values).toEqual({ email: 'thabo@example.co.za', password: 'secret' })
  })
})

describe('validateSignup', () => {
  const valid = {
    fullName: '  Thabo Molefe ',
    email: 'thabo@example.co.za',
    phone: '082 123 4567',
    password: 'lefa2026!',
    consent: true,
  }

  test('accepts valid input and normalises it', () => {
    const result = validateSignup(valid)
    expect(result.errors).toEqual({})
    expect(result.values).toEqual({
      fullName: 'Thabo Molefe',
      email: 'thabo@example.co.za',
      phone: '+27821234567',
      password: 'lefa2026!',
    })
  })

  test('reports every missing field at once', () => {
    const { errors } = validateSignup({ fullName: '', email: '', phone: '', password: '', consent: false })
    expect(Object.keys(errors).sort()).toEqual(['consent', 'email', 'fullName', 'password', 'phone'])
  })

  test.each(['short1', 'longpassword', '12345678'])('rejects weak password %p', (password) => {
    expect(validateSignup({ ...valid, password }).errors.password).toMatch(/at least 8 characters/)
  })

  test('rejects names longer than the database allows', () => {
    expect(validateSignup({ ...valid, fullName: 'a'.repeat(121) }).errors.fullName).toMatch(/120/)
  })

  test('requires POPIA consent', () => {
    expect(validateSignup({ ...valid, consent: false }).errors.consent).toMatch(/privacy notice/)
  })
})

describe('friendlyAuthError', () => {
  test.each([
    [{ code: 'invalid_credentials', message: 'Invalid login credentials' }, 'Incorrect email or password.'],
    [{ message: 'Invalid login credentials' }, 'Incorrect email or password.'],
    [{ code: 'user_already_exists', message: 'User already registered' }, /already exists/],
    [{ code: 'over_request_rate_limit', status: 429, message: 'x' }, /Too many attempts/],
    [{ name: 'AuthRetryableFetchError', status: 0, message: 'Failed to fetch' }, /couldn't reach Lefa/],
    [{ message: 'something odd' }, 'Something went wrong. Try again.'],
  ])('%o', (error, expected) => {
    expect(friendlyAuthError(error)).toMatch(expected)
  })
})

describe('roles', () => {
  test('members land on the vault, brokers and admins on the broker dashboard', () => {
    expect(homeFor('member')).toBe('/vault')
    expect(homeFor('broker')).toBe('/broker')
    expect(homeFor('admin')).toBe('/broker')
  })

  test('safeRedirect only allows paths inside the app', () => {
    expect(safeRedirect({ from: '/vault?tab=1' })).toBe('/vault?tab=1')
    expect(safeRedirect({ from: '//evil.example' })).toBeNull()
    expect(safeRedirect({ from: 'https://evil.example' })).toBeNull()
    expect(safeRedirect({ from: '/login' })).toBeNull()
    expect(safeRedirect(null)).toBeNull()
  })
})
