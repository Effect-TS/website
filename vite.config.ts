import { defineConfig } from "vite-plus"

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
      "vite-plus/prefer-vite-plus-imports": "error",
    },
  },
  test: {
    projects: [
      {
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

      build: "vp -C apps/web exec astro build",

      check: ["vp check", "vp -C apps/web exec astro check"],

      "dev:web": {
        command: "vp -C apps/web exec astro dev",
        cache: false,
      },

      fmt: ["vp fmt --check", 'prettier --check "**/*.astro"'],
      "fmt:fix": {
        command: ["vp fmt", 'prettier --write "**/*.astro"'],
        cache: false,
      },

      lint: "vp lint",
      "lint:fix": {
        command: "vp lint --fix",
        cache: false,
      },

      "mixedbread:index": {
        command: "vp exec mixedbread",
        cache: false,
      },

      test: "vp test",
    },
  },
})
