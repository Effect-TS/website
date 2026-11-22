import { defineConfig, devices } from "playwright/test"

// The Scratchpad with its language server in the browser (the default
// `PUBLIC_LSP_TRANSPORT=worker`): `astro dev` only, no lsp-bridge process.
// Needs packages/tsrs-lsp-wasm/dist (nix develop -c pnpm --filter
// @website/tsrs-lsp-wasm build). SCRATCHPAD_URL runs the spec against another
// server; SCRATCHPAD_BROWSERS picks projects (default chromium).
const externalUrl = process.env.SCRATCHPAD_URL
const webPort = Number.parseInt(
  process.env.SCRATCHPAD_WORKER_WEB_PORT ?? "14322",
  10,
)
const localBaseUrl = `http://127.0.0.1:${webPort}`
const browsers = (process.env.SCRATCHPAD_BROWSERS ?? "chromium")
  .split(",")
  .map((name) => name.trim())
  .filter((name) => name.length > 0)

const projects = {
  chromium: devices["Desktop Chrome"],
  firefox: devices["Desktop Firefox"],
  webkit: devices["Desktop Safari"],
} as const

export default defineConfig({
  testDir: "apps/web/test/e2e",
  testMatch: /scratchpad-worker\.spec\.ts$/,
  timeout: 90_000,
  workers: 1,
  projects: browsers.map((name) => ({
    name: `scratchpad-worker-${name}`,
    use: projects[name as keyof typeof projects] ?? { browserName: name },
  })),
  use: {
    baseURL: externalUrl ?? localBaseUrl,
    headless: true,
  },
  webServer:
    externalUrl === undefined
      ? {
          command: `PUBLIC_LSP_TRANSPORT=worker vp -C apps/web exec astro dev --host 127.0.0.1 --port ${webPort} --ignore-lock`,
          url: `${localBaseUrl}/scratchpad`,
          reuseExistingServer: false,
          timeout: 120_000,
        }
      : undefined,
})
