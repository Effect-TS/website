import { assert, test, vi } from "vite-plus/test"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"

vi.mock("../../../src/features/open-graph/renderer.ts", () => {
  class OpenGraphRenderer extends Context.Service<
    OpenGraphRenderer,
    {
      readonly render: (
        content: unknown,
        requestUrl: URL,
      ) => Effect.Effect<Uint8Array>
    }
  >()("test/OpenGraphRenderer") {}

  return { OpenGraphRenderer, layer: Layer.empty }
})

import {
  make,
  OpenGraphGenerator,
} from "../../../src/features/open-graph/generator.ts"
import {
  MetadataNotFound,
  OpenGraphContent,
} from "../../../src/features/open-graph/model.ts"
import { OpenGraphRenderer } from "../../../src/features/open-graph/renderer.ts"

const requestUrl = new URL("https://effect.website/og/example.png")

const generate = (
  slug: string,
  render: (
    content: OpenGraphContent,
    requestUrl: URL,
  ) => Effect.Effect<Uint8Array>,
) =>
  Effect.gen(function* () {
    const generator = yield* OpenGraphGenerator
    return yield* generator.generate(slug, requestUrl)
  }).pipe(
    Effect.provide(
      Layer.effect(OpenGraphGenerator, make).pipe(
        Layer.provide(Layer.succeed(OpenGraphRenderer, { render })),
      ),
    ),
    Effect.runPromise,
  )

test("resolves documentation metadata", async () => {
  const expected = OpenGraphContent.Docs({
    props: { title: "Introduction", subtitle: "GETTING STARTED" },
  })

  const result = await generate(
    "docs/v4/getting-started/introduction",
    (content, url) => {
      assert.deepEqual(content, expected)
      assert.equal(url, requestUrl)
      return Effect.succeed(Uint8Array.from([4, 5, 6]))
    },
  )

  assert.deepEqual(result, Uint8Array.from([4, 5, 6]))
})

test("resolves API reference metadata", async () => {
  const expected = OpenGraphContent.Api({
    props: { eyebrow: "API Reference", title: "Effect" },
  })

  await generate("docs/v4/api/effect/Effect", (content) => {
    assert.deepEqual(content, expected)
    return Effect.succeed(new Uint8Array())
  })
})

test("resolves blog metadata", async () => {
  const expected = OpenGraphContent.Blog({
    props: { title: "Announcement", subtitle: "News from Effect" },
  })

  await generate("blog/announcement", (content) => {
    assert.deepEqual(content, expected)
    return Effect.succeed(new Uint8Array())
  })
})

test("resolves playground metadata", async () => {
  const expected = OpenGraphContent.Docs({
    props: { title: "Effect Playground" },
  })

  await generate("play", (content) => {
    assert.deepEqual(content, expected)
    return Effect.succeed(new Uint8Array())
  })
})

test("fails when metadata is missing", async () => {
  const error = await generate("docs/v4/missing", () =>
    Effect.die("The renderer should not be invoked"),
  ).catch((cause: unknown) => cause)

  assert.deepEqual(error, new MetadataNotFound({ slug: "docs/v4/missing" }))
})
