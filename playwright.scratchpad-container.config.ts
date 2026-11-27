import { defineConfig, devices } from "playwright/test"

// The Scratchpad against a real WebContainer (Chromium only): boot, install,
// installed types, Runs, `pnpm add`, legacy shares, Ctrl+C and Restart.
// `astro dev` only: the legacy-share test stores its share in the dev
// shortener's memory.
//
// Needs packages/tsrs-lsp-wasm/dist (nix develop -c pnpm --filter
// @website/tsrs-lsp-wasm build), and network access to StackBlitz and the npm
// registry; without them the tests skip. SCRATCHPAD_URL runs the spec against
// another dev server. SCRATCHPAD_CONTAINER_RETRIES sets retries (default 2 on
// CI, 0 locally).
const externalUrl = process.env.SCRATCHPAD_URL
const webPort = Number.parseInt(
  process.env.SCRATCHPAD_CONTAINER_WEB_PORT ?? "14323",
  10,
)
const localBaseUrl = `http://127.0.0.1:${webPort}`
const retries = Number.parseInt(
  process.env.SCRATCHPAD_CONTAINER_RETRIES ?? (process.env.CI ? "2" : "0"),
  10,
)

export default defineConfig({
  testDir: "apps/web/test/e2e",
  testMatch: /scratchpad-container\.spec\.ts$/,
  timeout: 240_000,
  // One WebContainer per page, and each test boots and installs its own.
  workers: 1,
  retries,
  reporter: process.env.CI ? [["list"], ["github"]] : "list",
  projects: [
    { name: "scratchpad-container-chromium", use: devices["Desktop Chrome"] },
  ],
  use: {
    baseURL: externalUrl ?? localBaseUrl,
    headless: true,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  outputDir: "test-results/scratchpad-container",
  webServer:
    externalUrl === undefined
      ? {
          command: `vp -C apps/web exec astro dev --host 127.0.0.1 --port ${webPort} --ignore-lock`,
          url: `${localBaseUrl}/scratchpad`,
          reuseExistingServer: false,
          timeout: 120_000,
        }
      : undefined,
})
