/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/**/*.test.ts'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        // Override the project tsconfig so jest globals (`describe`, `it`,
        // `expect`, ...) resolve without touching the root tsconfig.json,
        // which is consumed by the Expo/Metro build.
        tsconfig: {
          target: 'ES2020',
          module: 'CommonJS',
          moduleResolution: 'node',
          esModuleInterop: true,
          strict: true,
          skipLibCheck: true,
          resolveJsonModule: true,
          types: ['jest', 'node'],
          paths: { '@/*': ['./src/*'] },
        },
      },
    ],
  },
};
