import { defineConfig } from "vite-plus"
import { fileURLToPath } from "node:url"

export default defineConfig({
  staged: {
    "*": "vp fmt",
    "*.astro": "prettier --write",
  },
  fmt: {
    printWidth: 80,
    semi: false,
    sortPackageJson: false,
  },
  lint: {
    plugins: ["typescript", "import"],
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    ignorePatterns: [".direnv", "dist"],
    options: {
      typeAware: true,
      typeCheck: true,
    },
    rules: {
      "import/namespace": "off",
      "typescript/no-misused-spread": "off",
      "typescript/unbound-method": "off",
      "vite-plus/prefer-vite-plus-imports": "error",
    },
  },
  test: {
    projects: [
      {
        resolve: {
          alias: {
            "@/": fileURLToPath(new URL("./apps/web/src/", import.meta.url)),
            "astro:assets": fileURLToPath(
              new URL("./apps/web/test/stubs/astro-assets.ts", import.meta.url),
            ),
            "astro:content": fileURLToPath(
              new URL(
                "./apps/web/test/stubs/astro-content.ts",
                import.meta.url,
              ),
            ),
          },
        },
        test: {
          name: "web",
          root: "apps/web",
          include: ["test/**/*.test.ts"],
        },
      },
      "apps/!(web)",
      "packages/*",
    ],
  },
  run: {
    cache: true,
    tasks: {
      "api-reference:generate": "vp exec api-reference generate",

      "astro:sync": {
        command: "vp -C apps/web exec astro sync",
        cache: false,
      },

      build: "vp -C apps/web exec astro build",

      check: {
        command: ["vp check", "vp -C apps/web exec astro check"],
        dependsOn: ["astro:sync"],
      },

      "dev:web": {
        command: "vp -C apps/web exec astro dev",
        cache: false,
      },

      fmt: ["vp fmt --check", 'prettier --check "**/*.astro"'],
      "fmt:fix": {
        command: ["vp fmt", 'prettier --write "**/*.astro"'],
        cache: false,
      },

      lint: {
        command: "vp lint",
        dependsOn: ["astro:sync"],
      },
      "lint:fix": {
        command: "vp lint --fix",
        cache: false,
        dependsOn: ["astro:sync"],
      },

      test: "vp test",
    },
  },
})
