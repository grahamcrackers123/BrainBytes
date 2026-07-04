module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  testTimeout: 30000,
  collectCoverage: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    '**/*.js',
    '!**/node_modules/**',
    '!**/coverage/**',
    '!jest.config.js',
  ],
  coverageReporters: ['text', 'lcov', 'html'],
};
