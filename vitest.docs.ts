import * as Doctest from "@effect/doctest/Plugin"
import { defineConfig } from "vitest/config"

export default defineConfig({
  plugins: [Doctest.plugin()],
  test: {
    passWithNoTests: false,
    testTimeout: 30_000,
    include: [],
    includeSource: ["src/content/docs/v4/**/*.mdx"],
  },
})
