module.exports = {
  preset: 'jest-expo',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '@react-native-async-storage/async-storage': '@react-native-async-storage/async-storage/jest/async-storage-mock',
  },
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  collectCoverageFrom: ['src/**/*.{ts,tsx}'],
};
