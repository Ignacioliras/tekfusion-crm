import { defineConfig, devices } from "@playwright/test";

// E2E de TekFusion. Vite lo levanta scripts/tekfusion/e2e.mjs (npm run test:e2e).
export default defineConfig({
  testDir: "./e2e/tekfusion",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://localhost:5180",
    locale: "es-CL",
    timezoneId: "America/Santiago",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
