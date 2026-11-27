import * as Option from "effect/Option"
import { assert, test } from "vite-plus/test"
import {
  normalizeScratchpadWorkspace,
  patchScratchpadTsConfig,
} from "../../../src/features/share/tsconfig.ts"
import { makeDefaultWorkspace } from "../../../src/features/share/workspace.ts"

const plugin = {
  name: "@effect/language-service",
  diagnosticSeverity: { unstableApiUsage: "off" },
}

test("adds the language service plugin and verbatimModuleSyntax, keeping other options", () => {
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

test("keeps other plugins and a configured language service entry's options", () => {
  const configured = {
    compilerOptions: {
      plugins: [
        { name: "other" },
        {
          name: "@effect/language-service",
          diagnosticSeverity: { floatingEffect: "error" },
        },
      ],
    },
  }
  const patched = JSON.parse(
    patchScratchpadTsConfig(JSON.stringify(configured))!,
  )
  assert.deepStrictEqual(patched.compilerOptions.plugins, [
    { name: "other" },
    {
      name: "@effect/language-service",
      diagnosticSeverity: { floatingEffect: "error", unstableApiUsage: "off" },
    },
  ])
})

test("leaves a config that already has the plugin and an explicit unstableApiUsage severity unchanged", () => {
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

test("leaves a mid-edit invalid tsconfig untouched", () => {
  assert.isUndefined(patchScratchpadTsConfig(`{ "compilerOptions": `))
})

test("a workspace loaded for the Scratchpad gets the plugin in its tsconfig.json", () => {
  const [tsconfig] = normalizeScratchpadWorkspace(makeDefaultWorkspace("v4"))
    .findFile("tsconfig.json")
    .pipe(Option.getOrThrow)
  const compilerOptions = JSON.parse(tsconfig.initialContent).compilerOptions

  assert.deepStrictEqual(
    {
      plugins: compilerOptions.plugins,
      verbatim: compilerOptions.verbatimModuleSyntax,
    },
    { plugins: [plugin], verbatim: true },
  )
})
