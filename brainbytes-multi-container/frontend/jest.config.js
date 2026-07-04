module.exports = {
  testEnvironment: 'jsdom',
  testMatch: ['**/tests/**/*.test.js'],
  testTimeout: 30000,
  moduleNameMapper: {
    '\\.module\\.css$': 'identity-obj-proxy',
    '\\.css$': 'identity-obj-proxy',
  },
  transform: {
    '^.+\\.jsx?$': 'babel-jest',
  },
  collectCoverage: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'components/**/*.js',
    'pages/**/*.js',
    '!pages/_app.js',
  ],
  coverageReporters: ['text', 'lcov', 'html'],
};
