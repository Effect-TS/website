import { defineConfig } from "vitest/config"

// The Part 1 template tests are in vitest.course.config.ts: they expect the
// lesson files unchanged, and a learner edits them in place.
export default defineConfig({
  test: {
    include: ["test/**/*.test.ts", "checkpoints/*/test/**/*.test.ts"]
  }
})
