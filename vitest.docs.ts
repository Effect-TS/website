import { stripTypeScriptTypes } from "node:module"
import * as Doctest from "@effect/doctest/Plugin"
import type { Plugin } from "vite"
import { defineConfig } from "vitest/config"

// Doctest's extracted snippet modules keep the .mdx extension of their source
// file (e.g. "batching.mdx?effect-doctest=snippet&index=5"), so Vite's
// extension-based loader selection never applies its TypeScript transform to
// them and the raw `interface`/type-annotation syntax reaches the plain-JS
// parser. Strip types ourselves, before Vite's default transform runs.
// (Uses node:module's stripTypeScriptTypes rather than the `typescript`
// package: this repo's `typescript` dependency is TS 7 (tsgo), whose npm
// package no longer ships the classic transpileModule compiler API.)
const stripDoctestSnippetTypes: Plugin = {
  name: "effect-doctest-strip-types",
  enforce: "pre",
  transform(code, id) {
    if (!id.includes("effect-doctest=snippet")) return null
    return { code: stripTypeScriptTypes(code, { mode: "strip" }), map: null }
  },
}

export default defineConfig({
  plugins: [stripDoctestSnippetTypes, Doctest.plugin()],
  test: {
    passWithNoTests: false,
    testTimeout: 30_000,
    include: [],
    includeSource: ["src/content/docs/v4/**/*.mdx"],
  },
})
