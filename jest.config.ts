import type { Config } from 'jest';

const config: Config = {
  verbose: true,
  clearMocks: true,
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
};

export default config;