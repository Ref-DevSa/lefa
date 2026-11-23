import '@testing-library/jest-dom'
import { TextDecoder, TextEncoder } from 'node:util'

// jsdom doesn't provide these, but React Router uses them.
Object.assign(globalThis, { TextEncoder, TextDecoder })
