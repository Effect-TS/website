import { defineConfig } from "vite-plus"

// Only test/: .cache/ holds the upstream checkouts, whose own test files must not be collected.
export default defineConfig({
  test: {
    name: "@website/tsrs-lsp-wasm",
    include: ["test/**/*.test.ts"],
  },
})
