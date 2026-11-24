export default {
  testEnvironment: '<rootDir>/jest.environment.cjs',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'],
  moduleNameMapper: {
    '\\.css$': '<rootDir>/src/__mocks__/style.js',
    // import.meta.env only exists in Vite; tests use fixed values instead.
    '/lib/env\\.js$': '<rootDir>/src/__mocks__/env.js',
  },
}
