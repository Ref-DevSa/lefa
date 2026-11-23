// jsdom doesn't ship the Fetch API, but React Router's data router builds a
// Request for every navigation. Expose Node's built-in implementations.
const { TestEnvironment } = require('jest-environment-jsdom')

module.exports = class LefaJsdomEnvironment extends TestEnvironment {
  constructor(...args) {
    super(...args)
    Object.assign(this.global, {
      Request,
      Response,
      Headers,
      fetch,
      AbortController,
      AbortSignal,
      TextEncoder,
      TextDecoder,
    })
  }
}
