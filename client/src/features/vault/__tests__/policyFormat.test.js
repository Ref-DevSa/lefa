import {
  EMPTY_FORM,
  formFromPolicy,
  initials,
  maskPolicyNumber,
  nextDebit,
  ordinal,
  parseRand,
  validatePolicyForm,
} from '../policyFormat.js'

describe('maskPolicyNumber', () => {
  test('shows only the last 4 characters', () => {
    expect(maskPolicyNumber('OM-104821')).toBe('•••• 4821')
  })
  test('short numbers are shown as-is', () => {
    expect(maskPolicyNumber('A12')).toBe('A12')
  })
})

describe('ordinal', () => {
  test.each([
    [1, '1st'], [2, '2nd'], [3, '3rd'], [4, '4th'], [11, '11th'], [12, '12th'],
    [13, '13th'], [21, '21st'], [22, '22nd'], [23, '23rd'], [25, '25th'], [31, '31st'],
  ])('%i → %s', (n, expected) => {
    expect(ordinal(n)).toBe(expected)
  })
})

describe('initials', () => {
  test.each([['Old Mutual', 'OM'], ['Sanlam', 'SA'], ['AVBOB', 'AV'], ['  ', '?']])('%p → %s', (name, expected) => {
    expect(initials(name)).toBe(expected)
  })
})

describe('parseRand', () => {
  test.each([
    ['30000', 30000], ['30 000', 30000], ['R30 000', 30000], ['30,000', 30000],
    ['199.50', 199.5], ['199,50', 199.5], ['1 250 000.75', 1250000.75], [' 85 000', 85000],
  ])('%p → %d', (text, expected) => {
    expect(parseRand(text)).toBe(expected)
  })
  test('empty is null', () => {
    expect(parseRand('  ')).toBeNull()
  })
  test.each(['abc', '-5', '1.2.3', '12a'])('%p is not a number', (text) => {
    expect(parseRand(text)).toBeNaN()
  })
})

describe('validatePolicyForm', () => {
  const filled = {
    ...EMPTY_FORM,
    insurer: ' Old Mutual ',
    policy_number: ' OM-1 ',
    cover_amount: '30 000',
    monthly_premium: '199,50',
    debit_day: '25',
  }

  test('turns the form into the API payload', () => {
    const { errors, values } = validatePolicyForm(filled)
    expect(errors).toEqual({})
    expect(values).toEqual({
      insurer: 'Old Mutual',
      policy_number: 'OM-1',
      type: 'funeral',
      status: 'active',
      cover_amount: 30000,
      monthly_premium: 199.5,
      debit_day: 25,
      beneficiaries: '',
      notes: '',
    })
  })

  test('blank amounts become R0 and a blank debit day is "not set"', () => {
    const { values } = validatePolicyForm({ ...filled, cover_amount: '', monthly_premium: '', debit_day: '' })
    expect(values).toMatchObject({ cover_amount: 0, monthly_premium: 0, debit_day: null })
  })

  test('explains each problem in plain words', () => {
    const { errors } = validatePolicyForm({
      ...EMPTY_FORM,
      cover_amount: 'lots',
      monthly_premium: '10.555',
      debit_day: '32',
    })
    expect(errors).toEqual({
      insurer: 'Insurer is required.',
      policy_number: 'Policy number is required.',
      cover_amount: 'Enter an amount in rand, like 30 000 or 199.50.',
      monthly_premium: 'Use at most 2 decimal places (cents).',
      debit_day: 'Debit day must be between 1 and 31.',
    })
  })

  test('formFromPolicy round-trips an existing policy', () => {
    const policy = { insurer: 'Sanlam', policy_number: 'SL-1', type: 'life', status: 'lapsed', cover_amount: 55000, monthly_premium: 288.5, debit_day: 1, beneficiaries: 'Lerato', notes: '' }
    expect(validatePolicyForm(formFromPolicy(policy)).values).toEqual(policy)
  })
})

describe('nextDebit', () => {
  const policies = [
    { insurer: 'Old Mutual', status: 'active', debit_day: 25, monthly_premium: 199 },
    { insurer: 'Sanlam', status: 'active', debit_day: 1, monthly_premium: 288 },
    { insurer: 'Clientele', status: 'lapsed', debit_day: 15, monthly_premium: 99 },
  ]

  test('finds the soonest upcoming debit among active policies', () => {
    const next = nextDebit(policies, new Date(2026, 10, 24)) // 24 Nov
    expect(next).toEqual({ date: new Date(2026, 10, 25), amount: 199, insurers: ['Old Mutual'] })
  })

  test('rolls over to next month and ignores lapsed policies', () => {
    const next = nextDebit(policies, new Date(2026, 10, 26)) // 26 Nov
    expect(next).toEqual({ date: new Date(2026, 11, 1), amount: 288, insurers: ['Sanlam'] })
  })

  test('a 31st debit falls on the last day of shorter months', () => {
    const next = nextDebit([{ insurer: 'X', status: 'active', debit_day: 31, monthly_premium: 10 }], new Date(2027, 1, 3))
    expect(next?.date).toEqual(new Date(2027, 1, 28))
  })

  test('null when nothing is scheduled', () => {
    expect(nextDebit([{ insurer: 'X', status: 'active', debit_day: null, monthly_premium: 10 }], new Date())).toBeNull()
  })
})
