import { formatDate, formatZAR } from '../format.js'

describe('formatZAR', () => {
  test.each([
    [0, 'R0'],
    [85000, 'R85 000'],
    [1250000, 'R1 250 000'],
    [29, 'R29'],
    [29.5, 'R29.50'],
    [-1500, '-R1 500'],
  ])('%p → %s', (input, expected) => {
    expect(formatZAR(input)).toBe(expected)
  })

  test('non-numbers show a dash', () => {
    expect(formatZAR(Number.NaN)).toBe('—')
  })
})

describe('formatDate', () => {
  test('formats a date-only string without timezone shift', () => {
    expect(formatDate('2026-11-22')).toBe('22 Nov 2026')
  })

  test('formats a Date', () => {
    expect(formatDate(new Date(2026, 0, 5))).toBe('5 Jan 2026')
  })

  test('invalid input shows a dash', () => {
    expect(formatDate('not a date')).toBe('—')
  })
})
