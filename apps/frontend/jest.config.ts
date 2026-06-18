import path from "path";
import type { Config } from "jest";
import nextJest from "next/jest";

const createJestConfig = nextJest({ dir: "./" });
const rootNodeModules = path.resolve(__dirname, "../../node_modules");

const config: Config = {
  testEnvironment: "jest-environment-jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  moduleDirectories: ["node_modules", rootNodeModules],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  testMatch: ["**/__tests__/**/*.test.[jt]s?(x)", "**/*.test.[jt]s?(x)"],
  testPathIgnorePatterns: [
    "<rootDir>/node_modules/",
    "<rootDir>/.next/",
    "<rootDir>/src/__tests__/pacts/",
    "<rootDir>/e2e/",
  ],
  coverageProvider: "v8",
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/**/__tests__/**",
  ],
  // Raise thresholds as tests are added across phases.
  coverageThreshold: {
    global: { lines: 5, functions: 4, branches: 14, statements: 5 },
  },
};

export default createJestConfig(config);
