import { defineConfig } from "vite-plus"
import { fileURLToPath } from "node:url"

export default defineConfig({
  staged: {
    "*.{js,jsx,ts,tsx,mjs,cjs,md,mdx,yaml,yml,toml,json}":
      "vp fmt --no-error-on-unmatched-pattern",
    "*.astro": "prettier --write",
  },
  fmt: {
    printWidth: 80,
    semi: false,
    sortPackageJson: false,
    ignorePatterns: ["packages/foldkit/**", "packages/devtools/**"],
  },
  lint: {
    plugins: ["typescript", "import"],
    jsPlugins: [
      { name: "vite-plus", specifier: "vite-plus/oxlint-plugin" },
      { name: "foldkit", specifier: "@foldkit/oxlint-plugin" },
    ],
    ignorePatterns: [
      ".direnv",
      "dist",
      "packages/foldkit/**",
      "packages/devtools/**",
    ],
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
    overrides: [
      {
        files: ["apps/web/src/features/visual-effect/program/**/*.ts"],
        excludeFiles: [
          "apps/web/src/features/visual-effect/program/drivers/**",
        ],
        rules: {
          "foldkit/acquire-release-constructs-in-acquire-body": "error",
          "foldkit/command-binding-matches-name": "error",
          "foldkit/command-define-pascal-const": "error",
          "foldkit/got-prefix-requires-submodel-payload": "error",
          "foldkit/got-submodel-message-name": "error",
          "foldkit/got-wrapper-carries-only-routing": "error",
          "foldkit/keyed-required-for-mapped-rows": "error",
          "foldkit/lazy-view-stable-references": "error",
          "foldkit/mount-factory-must-use-element": "error",
          "foldkit/no-array-index-view-keys": "error",
          "foldkit/no-child-message-construction-in-root": "error",
          "foldkit/no-direct-submodel-state-update": "error",
          "foldkit/no-disabling-dev-guardrails": "error",
          "foldkit/no-duplicate-onmount-per-element": "error",
          "foldkit/no-empty-children-array": "error",
          "foldkit/no-empty-commands-array": "error",
          "foldkit/no-empty-to-parent-out-message": "error",
          "foldkit/no-empty-object-tagged-call": "error",
          "foldkit/no-hand-rolled-command-struct": "error",
          "foldkit/no-hardcoded-route-strings": "error",
          "foldkit/no-impure-call-at-decision-time": "error",
          "foldkit/no-module-level-mutable-state": "error",
          "foldkit/no-nonportable-server-globals": "off",
          "foldkit/no-noop-message": "error",
          "foldkit/no-prevent-default-in-stream-operator": "error",
          "foldkit/no-raw-dom-event-attributes": "error",
          "foldkit/no-route-query-constructor-default": "error",
          "foldkit/no-spread-in-modify-fields": "error",
          "foldkit/no-switch-on-message-tag": "error",
          "foldkit/prefer-callable-message-constructor": "error",
          "foldkit/prefer-command-mapmessage": "error",
          "foldkit/prefer-effect-module-names": "error",
          "foldkit/prefer-option-over-nullable-in-model": "error",
          "foldkit/require-fold-for-child-update-result": "error",
          "foldkit/require-rel-for-external-link": "error",
          "foldkit/selection-submodel-factory-at-module-scope": "error",
          "foldkit/wrap-child-output-in-got-message": "error",
        },
      },
    ],
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
            "virtual:foldkit/build-id": fileURLToPath(
              new URL(
                "./apps/web/test/stubs/foldkit-build-id.ts",
                import.meta.url,
              ),
            ),
            "virtual:open-graph-metadata": fileURLToPath(
              new URL(
                "./apps/web/test/stubs/open-graph-metadata.ts",
                import.meta.url,
              ),
            ),
          },
        },
        test: {
          name: "web",
          root: "apps/web",
          include: ["test/**/*.test.ts"],
          server: {
            deps: { inline: ["foldkit", "@foldkit/ui", "@foldkit/devtools"] },
          },
        },
      },
      "apps/!(web|web-probe)",
      "packages/*",
    ],
  },
  run: {
    cache: true,
    tasks: {
      "api-reference:generate": "vp exec api-reference generate",

      "icons:generate": [
        "vp exec icon-generator generate",
        "fa7-brands:github",
        "fa7-brands:discord",
        "fa7-brands:x-twitter",
        "fa7-brands:youtube",
        "fa7-brands:linkedin",
        "fa7-brands:bluesky",
        "fa7-brands:spotify",
        "fa7-brands:npm",
        "--output apps/web/src/assets/icons",
      ].join(" "),

      "astro:sync": {
        command: "vp -C apps/web exec astro sync",
        cache: false,
      },

      build: {
        command: "vp -C apps/web exec astro build",
        dependsOn: ["icons:generate"],
      },

      check: {
        command: ["vp check", "vp -C apps/web exec astro check"],
        dependsOn: ["astro:sync", "icons:generate"],
      },

      "dev:web": {
        command: "vp -C apps/web exec astro dev",
        cache: false,
        dependsOn: ["icons:generate"],
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
      "test:e2e": {
        command: "vp exec playwright test",
        cache: false,
      },
    },
  },
})
