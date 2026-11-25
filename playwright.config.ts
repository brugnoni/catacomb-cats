import { defineConfig } from "@playwright/test";
// E2E_PORT lets two checkouts run the browser tests side by side.
// Default port derives from the checkout path so parallel chats never share a preview server.
const hash = [...process.cwd()].reduce(
  (h, c) => (h * 31 + c.charCodeAt(0)) % 1000,
  7,
);
const port = process.env.E2E_PORT ?? String(4200 + hash);
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
