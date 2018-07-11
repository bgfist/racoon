module.exports = {
  coverageDirectory: 'coverage',
  moduleFileExtensions: ['ts', 'js'],
  testEnvironment: 'jsdom',
  testMatch: ['**/__tests__/*.+ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest'
  }
}
