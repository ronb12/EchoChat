module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testTimeout: 300000, // 5 minutes timeout for each test
  verbose: true,
  collectCoverage: false,
  maxWorkers: 1, // Run tests sequentially to avoid conflicts
  globalSetup: '<rootDir>/tests/global-setup.js',
  globalTeardown: '<rootDir>/tests/global-teardown.js'
};
