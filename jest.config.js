module.exports = {
  preset: 'jest-expo',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '@react-native-async-storage/async-storage': '@react-native-async-storage/async-storage/jest/async-storage-mock',
  },
  setupFiles: ['react-native-gesture-handler/jestSetup'],
  // react-native-worklets (react-native-reanimated's dependency) needs its Jest-safe
  // files resolved instead of its real native module, or importing reanimated at all
  // crashes under Jest. See jest.resolver.js for why this can't just be Jest's default
  // resolver plus react-native-worklets/jest/resolver stacked - Jest only takes one.
  resolver: '<rootDir>/jest.resolver.js',
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/.claude/worktrees/'],
  collectCoverageFrom: ['src/**/*.{ts,tsx}'],
};
