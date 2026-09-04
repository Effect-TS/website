import { assert, test } from "vite-plus/test"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Fonts from "../src/Fonts.ts"

test("loads and caches fonts through the configured loader", async () => {
  let loadCount = 0
  const source = {
    name: "Inter",
    url: "https://effect.website/font.woff",
    weight: 400,
  } as const satisfies Fonts.FontSource
  const dependencies = Layer.merge(
    Layer.succeed(Fonts.FontCatalog, {
      resolve: () => Effect.succeed([source]),
    }),
    Layer.succeed(Fonts.FontLoader, {
      load: () => {
        loadCount += 1
        return Effect.succeed(new ArrayBuffer(1))
      },
    }),
  )

  await Effect.runPromise(
    Effect.gen(function* () {
      const fonts = yield* Fonts.Fonts
      assert.deepEqual(yield* fonts.load(new URL("https://effect.website")), [
        { data: new ArrayBuffer(1), name: "Inter", weight: 400 },
      ])
      yield* fonts.load(new URL("https://effect.website/docs"))
    }).pipe(Effect.provide(Fonts.layer.pipe(Layer.provide(dependencies)))),
  )

  assert.equal(loadCount, 1)
})
