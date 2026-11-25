import { defineConfig } from "@playwright/test";
// E2E_PORT lets two checkouts run the browser tests side by side.
const port = process.env.E2E_PORT ?? "4173";
export default defineConfig({
  testDir: "tests",
  // Many workers starve the preview server and cause timeouts.
  workers: 4,
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    browserName: "chromium",
    trace: "retain-on-failure",
  },
  webServer: {
    command: `pnpm preview --port ${port}`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: !process.env.CI,
  },
  reporter: process.env.CI ? "github" : "list",
});
