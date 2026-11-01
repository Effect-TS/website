import { defineConfig } from "vitest/config"

// The Part 1 template tests, run in course CI. They check every lesson file
// as shipped, so they fail once a learner edits the files in the local track.
export default defineConfig({
  test: {
    include: ["lessons/part1/test/**/*.test.ts"]
  }
})
