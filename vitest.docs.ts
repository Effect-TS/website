import type { Plugin } from "vite"
import * as Doctest from "@effect/doctest/Plugin"
import { stripTypeScriptTypes } from "node:module"
// oxlint-disable-next-line vite-plus/prefer-vite-plus-imports -- doctest uses the workspace Vite plugin types, not Vite+'s bundled type identity
import { defineConfig } from "vitest/config"

// Doctest's extracted snippet modules keep the .mdx extension of their source
// file (e.g. "batching.mdx?effect-doctest=snippet&index=5"), so Vite's
// extension-based loader selection never applies its TypeScript transform to
// them and the raw `interface`/type-annotation syntax reaches the plain-JS
// parser. Strip types ourselves, before Vite's default transform runs.
// (Uses node:module's stripTypeScriptTypes rather than the `typescript`
// package: this repo's `typescript` dependency is TS 7 (tsgo), whose npm
// package no longer ships the classic transpileModule compiler API.)
// mode: "transform" (not "strip") because doc snippets use constructor
// parameter properties (e.g. `constructor(readonly host: string) {}`), which
// "strip" mode rejects since it can't rewrite them into an assignment.
const stripDoctestSnippetTypes: Plugin = {
  name: "effect-doctest-strip-types",
  enforce: "pre",
  transform(code, id) {
    if (!id.includes("effect-doctest=snippet")) return null
    return {
      code: stripTypeScriptTypes(
        code,
        // Node runtime supports transform mode; current @types/node exposes strip only.
        { mode: "transform" } as never,
      ),
      map: null,
    }
  },
}

export default defineConfig({
  plugins: [stripDoctestSnippetTypes, Doctest.plugin()],
  test: {
    passWithNoTests: false,
    testTimeout: 30_000,
    include: [],
    includeSource: ["apps/web/src/content/docs/v4/**/*.mdx"],
  },
})
