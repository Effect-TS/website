import { configDefaults, defineConfig } from "vitest/config"

export default defineConfig({
  resolve: {
    // `vp test` runs vite-plus's own Vitest build. `@effect/vitest` and the
    // upstream tests must load that one, not the `vitest` package.
    alias: { vitest: "vite-plus/test" },
  },
  test: {
    environment: "happy-dom",
    include: ["src/**/*.test.ts"],
    // Needs the native TypeScript 7 package; this workspace uses TypeScript 6.
    exclude: [...configDefaults.exclude, "src/cssStyleProperties.test.ts"],
    server: { deps: { inline: ["@effect/vitest"] } },
    setupFiles: ["./src/test/vitest-setup.ts"],
  },
})
