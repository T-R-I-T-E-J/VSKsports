import { defineConfig, devices } from "@playwright/test";

/**
 * Browser tests.
 *
 * These exist because 60 server-side tests proved the *logic* correct while
 * nobody had ever asserted that a customer can load a page and reach checkout.
 * A page that throws during render passes every unit test in the suite.
 *
 * They run against a real dev server and a real database, so they are slower
 * and are kept deliberately few: the journeys that lose money if they break.
 */
const PORT = Number(process.env.E2E_PORT ?? 3000);
const BASE_URL = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  // A failing e2e test is usually a real failure, but browser tests flake on
  // shared CI machines; one retry there, none locally where a flake should be
  // investigated rather than hidden.
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? "list" : [["list"]],
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // Reuse a server that is already running locally; start one in CI.
  //
  // This uses the ordinary dev port rather than a dedicated one: Next 16
  // refuses to start a second dev server against the same directory, so an
  // alternate port does not isolate anything — it just fails when a dev server
  // is already up. Reusing it is the only arrangement that works both locally
  // and on a clean CI machine.
  webServer: {
    command: `npx next dev --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
