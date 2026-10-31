import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts", "checkpoints/*/test/**/*.test.ts"]
  }
})
