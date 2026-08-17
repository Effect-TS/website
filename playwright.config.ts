import { defineConfig } from "playwright/test"

const externalUrl = process.env.PLAYGROUND_URL

export default defineConfig({
  testDir: "apps/web/test/e2e",
  timeout: 60_000,
  workers: 1,
  use: {
    baseURL: externalUrl ?? "http://localhost:1337",
    headless: true,
  },
  webServer:
    externalUrl === undefined
      ? {
          command: "vp exec alchemy dev",
          reuseExistingServer: true,
          timeout: 120_000,
          url: "http://localhost:1337/play",
        }
      : undefined,
})
