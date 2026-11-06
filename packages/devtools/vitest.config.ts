import { foldkitViewIdentity } from "@foldkit/vite-plugin"
import { defineConfig } from "vitest/config"

export default defineConfig({
  plugins: [foldkitViewIdentity()],
  test: {
    environment: "happy-dom",
    include: ["src/**/*.test.ts"],
    server: { deps: { inline: ["foldkit", "@foldkit/ui"] } },
  },
})
