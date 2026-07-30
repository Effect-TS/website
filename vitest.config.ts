import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: {
    // Mirror the astro.config.ts alias exactly (note the trailing slash).
    alias: { "@/": fileURLToPath(new URL("./src/", import.meta.url)) },
  },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
    globals: false,
    // Pins a non-UTC offset so formatBlogDate's explicit `timeZone: "UTC"`
    // is actually exercised: without it, formatting would silently fall
    // back to this process TZ and shift UTC-midnight dates by a day.
    env: { TZ: "America/New_York" },
  },
})
