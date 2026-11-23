import * as Option from "effect/Option"
import { assert, test } from "vite-plus/test"
import {
  normalizeScratchpadWorkspace,
  patchScratchpadTsConfig,
} from "../../../src/features/share/tsconfig.ts"
import {
  makeDefaultWorkspace,
  makeFile,
  normalizeWorkspace,
} from "../../../src/features/share/workspace.ts"

const plugin = {
  name: "@effect/language-service",
  diagnosticSeverity: { unstableApiUsage: "off" },
}

test("adds the language service plugin and verbatimModuleSyntax", () => {
  const patched = patchScratchpadTsConfig(
    JSON.stringify({ compilerOptions: { strict: true }, include: ["src"] }),
  )

  assert.deepStrictEqual(JSON.parse(patched!), {
    compilerOptions: {
      strict: true,
      plugins: [plugin],
      verbatimModuleSyntax: true,
    },
    include: ["src"],
  })
})

test("keeps existing plugins and adds compilerOptions when missing", () => {
  const patched = patchScratchpadTsConfig(
    JSON.stringify({ compilerOptions: { plugins: [{ name: "other" }] } }),
  )
  assert.deepStrictEqual(JSON.parse(patched!).compilerOptions.plugins, [
    { name: "other" },
    plugin,
  ])

  const created = patchScratchpadTsConfig("{}")
  assert.deepStrictEqual(JSON.parse(created!), {
    compilerOptions: { plugins: [plugin], verbatimModuleSyntax: true },
  })
})

test("is idempotent", () => {
  const once = patchScratchpadTsConfig(JSON.stringify({ compilerOptions: {} }))
  assert.isDefined(once)
  assert.isUndefined(patchScratchpadTsConfig(once!))
})

test("keeps a configured plugin entry's options, turns unstable API warnings off, and overrides verbatimModuleSyntax", () => {
  const configured = {
    compilerOptions: {
      plugins: [
        {
          name: "@effect/language-service",
          diagnosticSeverity: { floatingEffect: "error" },
        },
      ],
      verbatimModuleSyntax: false,
    },
  }
  const patched = JSON.parse(
    patchScratchpadTsConfig(JSON.stringify(configured))!,
  )
  assert.deepStrictEqual(patched.compilerOptions.plugins, [
    {
      name: "@effect/language-service",
      diagnosticSeverity: { floatingEffect: "error", unstableApiUsage: "off" },
    },
  ])
  assert.isTrue(patched.compilerOptions.verbatimModuleSyntax)
})

test("keeps an explicit unstableApiUsage severity", () => {
  const configured = {
    compilerOptions: {
      plugins: [
        {
          name: "@effect/language-service",
          diagnosticSeverity: { unstableApiUsage: "warning" },
        },
      ],
      verbatimModuleSyntax: true,
    },
  }
  assert.isUndefined(patchScratchpadTsConfig(JSON.stringify(configured)))
})

test("reads tsconfig files with comments and trailing commas", () => {
  const patched = patchScratchpadTsConfig(`{
  // compiler settings
  "compilerOptions": {
    /* keep "strict" */
    "strict": true,
    "paths": { "~/*": ["./src/*"] },
  },
}`)
  assert.deepStrictEqual(JSON.parse(patched!), {
    compilerOptions: {
      strict: true,
      paths: { "~/*": ["./src/*"] },
      plugins: [plugin],
      verbatimModuleSyntax: true,
    },
  })
})

test("leaves invalid or non-object JSON untouched", () => {
  assert.isUndefined(patchScratchpadTsConfig(`{ "compilerOptions": `))
  assert.isUndefined(patchScratchpadTsConfig(`[]`))
})

test("normalizes a workspace's root tsconfig.json for the Scratchpad", () => {
  const workspace = makeDefaultWorkspace("v4")
  const normalized = normalizeScratchpadWorkspace(workspace)
  const [tsconfig] = normalized
    .findFile("tsconfig.json")
    .pipe(Option.getOrThrow)
  const compilerOptions = JSON.parse(tsconfig.initialContent).compilerOptions

  assert.deepStrictEqual(compilerOptions.plugins, [plugin])
  assert.isTrue(compilerOptions.verbatimModuleSyntax)
})

test("the Playground's normalizeWorkspace does not inject the plugin", () => {
  const [tsconfig] = normalizeWorkspace(makeDefaultWorkspace("v4"))
    .findFile("tsconfig.json")
    .pipe(Option.getOrThrow)
  const compilerOptions = JSON.parse(tsconfig.initialContent).compilerOptions
  assert.isUndefined(compilerOptions.plugins)
  assert.isUndefined(compilerOptions.verbatimModuleSyntax)
})

test("restores a missing tsconfig.json before injecting the plugin", () => {
  const workspace = makeDefaultWorkspace("v4").filterMap((node) =>
    node.name === "tsconfig.json" ? Option.none() : Option.some(node),
  )
  const [tsconfig] = normalizeScratchpadWorkspace(
    workspace.append(makeFile("other.json", "{}")),
  )
    .findFile("tsconfig.json")
    .pipe(Option.getOrThrow)
  assert.deepStrictEqual(
    JSON.parse(tsconfig.initialContent).compilerOptions.plugins,
    [plugin],
  )
})
