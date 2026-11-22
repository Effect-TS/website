import { defineConfig } from "playwright/test"

const externalUrl = process.env.SCRATCHPAD_URL
const bridgePort = Number.parseInt(
  process.env.SCRATCHPAD_BRIDGE_PORT ?? "18787",
  10,
)
const webPort = Number.parseInt(process.env.SCRATCHPAD_WEB_PORT ?? "14321", 10)
const bridgeWsUrl = `ws://127.0.0.1:${bridgePort}`
const localBaseUrl = `http://127.0.0.1:${webPort}`

export default defineConfig({
  testDir: "apps/web/test/e2e",
  testMatch: /scratchpad\.spec\.ts$/,
  timeout: 60_000,
  workers: 1,
  projects: [
    {
      name: "scratchpad",
      use: {
        browserName: "chromium",
      },
    },
  ],
  use: {
    baseURL: externalUrl ?? localBaseUrl,
    headless: true,
  },
  webServer:
    externalUrl === undefined
      ? [
          {
            command: `HOST=127.0.0.1 PORT=${bridgePort} node packages/lsp-bridge/src/server.ts`,
            port: bridgePort,
            reuseExistingServer: false,
            timeout: 30_000,
          },
          {
            command: `PUBLIC_LSP_TRANSPORT=websocket PUBLIC_LSP_WS_URL=${bridgeWsUrl} vp -C apps/web exec astro dev --host 127.0.0.1 --port ${webPort} --ignore-lock`,
            url: `${localBaseUrl}/scratchpad`,
            reuseExistingServer: false,
            timeout: 120_000,
          },
        ]
      : undefined,
})
