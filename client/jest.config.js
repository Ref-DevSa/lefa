export default {
  testEnvironment: '<rootDir>/jest.environment.cjs',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'],
  moduleNameMapper: {
    '\\.css$': '<rootDir>/src/__mocks__/style.js',
  },
}
