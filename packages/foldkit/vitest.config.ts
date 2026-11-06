import { configDefaults, defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    environment: "happy-dom",
    include: ["src/**/*.test.ts"],
    // Needs the native TypeScript 7 package; this workspace uses TypeScript 6.
    exclude: [...configDefaults.exclude, "src/cssStyleProperties.test.ts"],
    setupFiles: ["./src/test/vitest-setup.ts"],
  },
})
