// Fetch API and TextEncoder globals come from jest.environment.cjs.
import '@testing-library/jest-dom'

// Under a busy test run (or slow CI) screens can take over the default 1s to
// update; wait up to 5s before deciding something never appeared.
import { configure } from '@testing-library/react'
configure({ asyncUtilTimeout: 5000 })
