import { defineConfig, devices } from "@playwright/test";

const e2eBaseUrl = "http://127.0.0.1:4173";

export default defineConfig({
  expect: {
    timeout: 5000,
  },
  testDir: "./tests/e2e",
  use: {
    baseURL: e2eBaseUrl,
    trace: "on-first-retry",
  },
  webServer: {
    command: "pnpm exec vite --host 0.0.0.0 --port 4173 --strictPort",
    env: {
      VITE_USE_LOCAL_AUTH: "true",
    },
    reuseExistingServer: !process.env.CI,
    stderr: "pipe",
    stdout: "pipe",
    timeout: 120000,
    url: e2eBaseUrl,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
