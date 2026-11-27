import { defineConfig } from "playwright/test"

const externalUrl = process.env.PLAYGROUND_URL

export default defineConfig({
  testDir: "apps/web/test/e2e",
  // The Scratchpad specs have their own configs (playwright.scratchpad-*.config.ts).
  testIgnore: /scratchpad-(worker|share|container)\.spec\.ts$/,
  timeout: 60_000,
  workers: 1,
  use: {
    baseURL: externalUrl ?? "http://localhost:14337",
    headless: true,
  },
  webServer:
    externalUrl === undefined
      ? {
          command: "WEBSITE_REVISION=$(git rev-parse HEAD) vp exec alchemy dev",
          reuseExistingServer: false,
          timeout: 120_000,
          url: "http://localhost:14337/play",
        }
      : undefined,
})
