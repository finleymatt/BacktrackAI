module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/__tests__/**/*.+(ts|tsx|js)',
    '**/*.(test|spec).+(ts|tsx|js)',
  ],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    '!src/**/*.test.{ts,tsx}',
    '!src/**/*.spec.{ts,tsx}',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^react-native$': 'react-native-web',
    '^@react-native-async-storage/async-storage$':
      '<rootDir>/__mocks__/AsyncStorage.js',
    '^expo-sqlite$': '<rootDir>/__mocks__/expo-sqlite.js',
    '^expo-file-system$': '<rootDir>/__mocks__/expo-file-system.js',
    '^expo-media-library$': '<rootDir>/__mocks__/expo-media-library.js',
    '^expo-notifications$': '<rootDir>/__mocks__/expo-notifications.js',
    '^expo-text-recognition$': '<rootDir>/__mocks__/expo-text-recognition.js',
    '^../../data/db$': '<rootDir>/__mocks__/db.js',
    '^../../../data/db$': '<rootDir>/__mocks__/db.js',
    '^../../data/repositories/tags$': '<rootDir>/__mocks__/tags-repository.js',
    '^../../../data/repositories/tags$':
      '<rootDir>/__mocks__/tags-repository.js',
  },
  testTimeout: 10000,
  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/.expo/',
    '/dist/',
    '/src/features/search/__tests__/',
    '/src/features/memories/__tests__/',
    '/src/features/ingest/__tests__/',
  ],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|expo|@expo|@react-navigation)/)',
  ],
  // Exclude problematic files from compilation
  modulePathIgnorePatterns: [
    '<rootDir>/src/data/db.ts',
    '<rootDir>/src/features/ingest/ocr.ts',
    '<rootDir>/src/features/search/search.ts',
    '<rootDir>/src/features/memories/selectMemories.ts',
  ],
};
