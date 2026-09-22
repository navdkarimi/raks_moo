import { randomUUID } from "node:crypto";
import { defineConfig, devices } from "@playwright/test";

const runKey = process.env.RAQS_E2E_KEY ?? randomUUID();
process.env.RAQS_E2E_KEY = runKey;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: "list",
  globalTeardown: "./tests/e2e/global-teardown.ts",
  use: {
    baseURL: "http://127.0.0.1:3100",
    ...devices["Desktop Chrome"],
    ...(process.env.PLAYWRIGHT_CHANNEL
      ? { channel: process.env.PLAYWRIGHT_CHANNEL }
      : {}),
    trace: "off",
    screenshot: "only-on-failure",
  },
  webServer: [
    {
      command: "npm run test:browser-server -w @raqs/api",
      url: "http://127.0.0.1:4100/api/v1/health/ready",
      reuseExistingServer: false,
      timeout: 60_000,
      env: { NODE_ENV: "test", RAQS_E2E_KEY: runKey },
    },
    {
      command: "npm run dev -w @raqs/web -- --hostname 127.0.0.1 --port 3100",
      url: "http://127.0.0.1:3100/login",
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        RAQS_E2E: "1",
        API_ORIGIN: "http://127.0.0.1:4100",
        NEXT_TELEMETRY_DISABLED: "1",
      },
    },
  ],
});
