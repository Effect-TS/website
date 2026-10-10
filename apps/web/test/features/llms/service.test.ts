import { assert, test } from "vite-plus/test"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { LlmsContent } from "../../../src/features/llms/content.ts"
import { Llms } from "../../../src/features/llms/service.ts"

const content = Layer.succeed(LlmsContent, {
  docGroups: (version) =>
    Effect.succeed([
      {
        label: "Start",
        docs: [
          {
            id: `${version}/getting-started/index`,
            title: "Getting started",
            description: "Begin here.",
            body: "Welcome.",
          },
        ],
      },
    ]),
})

const run = <A, E>(effect: Effect.Effect<A, E, Llms>) =>
  Effect.runPromise(
    effect.pipe(Effect.provide(Llms.layer.pipe(Layer.provide(content)))),
  )

test("docs scope renders index and full from content", async () => {
  const { index, full } = await run(
    Effect.gen(function* () {
      const llms = yield* Llms
      const scope = yield* llms.scope("docs", { version: "v4" })
      return {
        index: yield* llms.scopeIndex(scope),
        full: yield* llms.scopeFull(scope),
      }
    }),
  )
  assert.include(
    index,
    "- [Getting started](https://effect.website/docs/v4/getting-started.md): Begin here.",
  )
  assert.include(
    full,
    "source: https://effect.website/docs/v4/getting-started\n---\n\n# Getting started\n\nWelcome.",
  )
})

test("root files cover the docs scope", async () => {
  const { index, full } = await run(
    Effect.gen(function* () {
      const llms = yield* Llms
      return { index: yield* llms.rootIndex, full: yield* llms.rootFull }
    }),
  )
  assert.include(index, "https://effect.website/docs/v4/llms.txt")
  assert.include(full, "# Getting started")
})

test("unknown scope fails with LlmsScopeNotFound", async () => {
  const error = await run(
    Effect.gen(function* () {
      const llms = yield* Llms
      return yield* llms.scope("docs", { version: "v9" }).pipe(Effect.flip)
    }),
  )
  assert.equal(error._tag, "LlmsScopeNotFound")
})
