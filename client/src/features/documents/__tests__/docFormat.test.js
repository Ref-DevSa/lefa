import { checklistFor, docTypeLabel, formatBytes, readiness, validateFile } from '../docFormat.js'

const docs = [
  { id: 'd1', doc_type: 'certified_id', policy_id: null },
  { id: 'd2', doc_type: 'policy_schedule', policy_id: 'om' },
  { id: 'd3', doc_type: 'bank_letter', policy_id: 'sl' }, // linked to one policy, still counts for the person
]

describe('checklistFor', () => {
  test('ID and bank letter count for every policy; a schedule only for its own policy', () => {
    expect(checklistFor('om', docs).map((i) => [i.label, i.done])).toEqual([
      ['Certified ID copy', true],
      ['Bank confirmation letter', true],
      ['Policy schedule', true],
    ])
    expect(checklistFor('sl', docs).map((i) => i.done)).toEqual([true, true, false])
  })

  test('each item knows which document satisfies it', () => {
    expect(checklistFor('om', docs)[2].document?.id).toBe('d2')
    expect(checklistFor('sl', docs)[2].document).toBeNull()
  })
})

describe('readiness', () => {
  test('counts ready items across all policies (3 per policy)', () => {
    expect(readiness([{ id: 'om' }, { id: 'sl' }, { id: 'cl' }], docs)).toEqual({ ready: 7, needed: 9 })
  })
  test('no policies means nothing needed', () => {
    expect(readiness([], docs)).toEqual({ ready: 0, needed: 0 })
  })
})

describe('validateFile', () => {
  const file = (/** @type {string} */ name, /** @type {string} */ type, size = 1000) =>
    /** @type {File} */ (/** @type {unknown} */ ({ name, type, size }))

  test.each([
    ['a.pdf', 'application/pdf'],
    ['a.jpg', 'image/jpeg'],
    ['a.png', 'image/png'],
  ])('accepts %s', (name, type) => {
    expect(validateFile(file(name, type))).toBeNull()
  })

  test('rejects other types', () => {
    expect(validateFile(file('a.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'))).toBe(
      'Upload a PDF, JPG or PNG file.',
    )
  })

  test('rejects files over 5 MB and says how big it was', () => {
    expect(validateFile(file('scan.pdf', 'application/pdf', 6.2 * 1024 * 1024))).toBe(
      'This file is 6.2 MB. Files can be up to 5 MB.',
    )
  })
})

test('formatBytes', () => {
  expect(formatBytes(900)).toBe('900 B')
  expect(formatBytes(2048)).toBe('2 KB')
  expect(formatBytes(2.45 * 1024 * 1024)).toBe('2.5 MB')
})

test('docTypeLabel', () => {
  expect(docTypeLabel('bank_letter')).toBe('Bank confirmation letter')
  expect(docTypeLabel('mystery')).toBe('mystery')
})
