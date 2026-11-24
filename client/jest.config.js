export default {
  testEnvironment: '<rootDir>/jest.environment.cjs',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'],
  // Screen tests type into forms like a person; give slow CI machines room.
  testTimeout: 20000,
  moduleNameMapper: {
    '\\.css$': '<rootDir>/src/__mocks__/style.js',
    // import.meta.env only exists in Vite; tests use fixed values instead.
    '/lib/env\\.js$': '<rootDir>/src/__mocks__/env.js',
  },
}
