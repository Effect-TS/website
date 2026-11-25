/**
 * A two-file Workspace for tests that need a cross-file import and one
 * Effect diagnostic. This was the Scratchpad seed before it moved to the
 * Playground v4 template.
 */
const GREETER_SNIPPET = `import { Effect } from "effect"

export const greet = (name: string) =>
  Effect.succeed(\`Hello, \${name}!\`)
`

export const MAIN_SNIPPET = `import { Effect } from "effect"
import { greet } from "./greeter.ts"

const program = Effect.gen(function* () {
  // Floating Effect (Effect TS377001) — yield* or remove to resolve
  Effect.succeed("unhandled")

  const greeting = yield* greet("Effect")
  return greeting
})

export { program }
`

export const GREETER_FILES: Readonly<Record<string, string>> = {
  "src/main.ts": MAIN_SNIPPET,
  "src/greeter.ts": GREETER_SNIPPET,
}
