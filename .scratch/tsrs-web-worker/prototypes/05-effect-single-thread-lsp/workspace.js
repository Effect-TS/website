// The workspace every runner uses: effect 4.1.5's .d.ts and package.json files (supplied by the runner), the bridge
// tsconfig (packages/lsp-bridge/workspace.tsconfig.json, with the @effect/language-service plugin entry), and the
// sources below, rooted at /workspace like the Scratchpad (config.ts: SCRATCHPAD_ROOT_URI = file:///workspace).

export const ROOT = "/workspace"
export const ROOT_URI = "file:///workspace"
export const uriOf = (rel) => `${ROOT_URI}/${rel}`

// packages/lsp-bridge/workspace.tsconfig.json, verbatim apart from the optional skipLibCheck and plugin options.
export function tsconfig({
  skipLibCheck = false,
  plugin = true,
  pluginOptions = {},
} = {}) {
  return {
    compilerOptions: {
      strict: true,
      exactOptionalPropertyTypes: true,
      noEmit: true,
      target: "ES2022",
      module: "ESNext",
      moduleResolution: "bundler",
      allowImportingTsExtensions: true,
      types: [],
      plugins: plugin
        ? [{ name: "@effect/language-service", ...pluginOptions }]
        : [],
      ...(skipLibCheck ? { skipLibCheck: true } : {}),
    },
    include: ["**/*.ts", "**/*.tsx"],
    exclude: ["node_modules"],
  }
}

// apps/web/src/features/scratchpad/config.ts DEFAULT_SCRATCHPAD_FILES.
export const MAIN = `import { Effect } from "effect"
import { greet } from "./greeter.ts"

const program = Effect.gen(function* () {
  // Floating Effect (Effect TS377001) — yield* or remove to resolve
  Effect.succeed("unhandled")

  const greeting = yield* greet("Effect")
  return greeting
})

export { program }
`

export const GREETER = `import { Effect } from "effect"

export const greet = (name: string) =>
  Effect.succeed(\`Hello, \${name}!\`)
`

// prototypes/04-effect-wasm/test-project/main.ts: five planted Effect issues and one TS2322.
export const ISSUES = `import { Effect } from "effect"

class MyError {
  readonly _tag = "MyError"
}

// 1. floatingEffect
export const floating = Effect.gen(function* () {
  Effect.log("floating")
  return 1
})

// 2. missingStarInYieldEffectGen
export const missingStar = Effect.gen(function* () {
  const n = yield Effect.succeed(1)
  return n
})

// 3. missingReturnYieldStar
export const missingReturn = Effect.gen(function* () {
  const x = yield* Effect.succeed(1)
  if (x > 0) {
    yield* Effect.fail(new MyError())
  }
  return x
})

// 4. unnecessaryEffectGen
export const unnecessary = Effect.gen(function* () {
  return yield* Effect.succeed(42)
})

// 5. tryCatchInEffectGen
export const tryCatch = Effect.gen(function* () {
  try {
    const v = yield* Effect.succeed(1)
    return v
  } catch (e) {
    return 0
  }
})

// 6. plain TS2322
export const wrong: string = 1
`

// A Scratchpad-style program (services, Schema, Stream, Layer), prototype 03's MAIN. Planted: TS2322 on line 7
// (label: string = now), and the Effect rules find schemaSyncInEffect and provideLayerSucceedToProvideService.
export const APP = `import { Context, Effect, Layer, Schema, Stream } from "effect"
class Clock extends Context.Service<Clock, { readonly now: Effect.Effect<number> }>()("Clock") {}
const User = Schema.Struct({ id: Schema.Number, name: Schema.String })
const program = Effect.gen(function* () {
  const clock = yield* Clock
  const now = yield* clock.now
  const label: string = now
  const xs = yield* Stream.runCollect(Stream.make(1, 2, 3))
  return { label, xs, u: Schema.decodeUnknownSync(User)({}) }
})
export const run = program.pipe(Effect.provide(Layer.succeed(Clock, { now: Effect.succeed(1) })))
`

// Targets for refactors, hover, inlay hints and document symbols.
export const REFACTORS = `import { Effect, Context, Layer } from "effect"

export async function fetchCount(url: string) {
  const res = await fetch(url)
  const body = await res.json()
  return body.length as number
}

export type Person = { readonly name: string; readonly age: number }

export const genToFn = (n: number) =>
  Effect.gen(function* () {
    const x = yield* Effect.succeed(n)
    return x + 1
  })

export const piped = Effect.succeed(1).pipe(Effect.map((n) => n + 1), Effect.flatMap((n) => Effect.succeed(n * 2)))

export class Db extends Context.Service<Db, { readonly query: (sql: string) => Effect.Effect<ReadonlyArray<unknown>> }>()("Db") {}

export const DbLive = Layer.succeed(Db, { query: () => Effect.succeed([]) })

export const useDb = Effect.gen(function* () {
  const db = yield* Db
  const rows = yield* db.query("select 1")
  return rows.length
})
`

export const SOURCES = {
  "src/main.ts": MAIN,
  "src/greeter.ts": GREETER,
  "src/issues.ts": ISSUES,
  "src/app.ts": APP,
  "src/refactors.ts": REFACTORS,
}

/** effectFiles: { "/workspace/node_modules/effect/...": contents }. Returns the full in-memory file map. */
export function workspaceFiles(effectFiles, tsconfigOptions) {
  const files = { ...effectFiles }
  files[`${ROOT}/tsconfig.json`] = JSON.stringify(
    tsconfig(tsconfigOptions),
    null,
    2,
  )
  for (const [rel, text] of Object.entries(SOURCES))
    files[`${ROOT}/${rel}`] = text
  return files
}
