import { assert, test } from "vite-plus/test"
import { Effect, Layer } from "effect"
import { OpenGraph } from "../../../src/features/open-graph/Application.ts"
import {
  OgContent,
  type OgContentService,
} from "../../../src/features/open-graph/Content.ts"
import {
  OgNotFound,
  type OgCard,
} from "../../../src/features/open-graph/Model.ts"
import {
  OgRenderer,
  type OgRendererService,
} from "../../../src/features/open-graph/Renderer.ts"

const requestUrl = new URL("https://effect.website/og/example.png")

const runGenerate = (
  resolve: OgContentService["resolve"],
  render: OgRendererService["render"],
) => {
  const layer = Layer.effect(OpenGraph, OpenGraph.make).pipe(
    Layer.provide(Layer.succeed(OgContent, { resolve })),
    Layer.provide(Layer.succeed(OgRenderer, { render })),
  )
  return Effect.gen(function* () {
    const openGraph = yield* OpenGraph
    return yield* openGraph.generate("example", requestUrl)
  }).pipe(Effect.provide(layer))
}

test("returns static images without invoking the renderer", async () => {
  const expected = Uint8Array.from([1, 2, 3])
  const result = await Effect.runPromise(
    runGenerate(
      () => Effect.succeed({ _tag: "Static", bytes: expected }),
      () => Effect.die("The renderer should not be invoked"),
    ),
  )

  assert.deepEqual(result, expected)
})

test("delegates dynamic cards to the renderer", async () => {
  const expected = Uint8Array.from([4, 5, 6])
  const card = {
    _tag: "Docs",
    props: { title: "Effect", subtitle: "GETTING STARTED" },
  } as const satisfies OgCard
  const result = await Effect.runPromise(
    runGenerate(
      () => Effect.succeed(card),
      (resolved, url) => {
        assert.deepEqual(resolved, card)
        assert.equal(url, requestUrl)
        return Effect.succeed(expected)
      },
    ),
  )

  assert.deepEqual(result, expected)
})

test("preserves not-found failures", async () => {
  const error = await Effect.runPromise(
    runGenerate(
      (slug) => Effect.fail(new OgNotFound({ slug })),
      () => Effect.die("The renderer should not be invoked"),
    ).pipe(Effect.flip),
  )

  assert.deepEqual(error, new OgNotFound({ slug: "example" }))
})
