import { assert, test } from "vite-plus/test"
import { Effect } from "effect"
import { OgContent, layer } from "../../../src/features/open-graph/Content.ts"
import { OgNotFound } from "../../../src/features/open-graph/Model.ts"

const resolve = (slug: string) =>
  Effect.gen(function* () {
    const content = yield* OgContent
    return yield* content.resolve(slug)
  }).pipe(Effect.provide(layer), Effect.runPromise)

test("resolves documentation metadata", async () => {
  assert.deepEqual(await resolve("docs/v4/getting-started/introduction"), {
    _tag: "Docs",
    props: { title: "Introduction", subtitle: "GETTING STARTED" },
  })
})

test("resolves API reference metadata", async () => {
  assert.deepEqual(await resolve("docs/v4/api/effect/Effect"), {
    _tag: "ApiReference",
    props: { eyebrow: "API Reference", title: "Effect" },
  })
})

test("resolves blog metadata", async () => {
  assert.deepEqual(await resolve("blog/announcement"), {
    _tag: "Blog",
    props: { title: "Announcement", subtitle: "News from Effect" },
  })
})

test("fails when metadata is missing", async () => {
  const error = await resolve("docs/v4/missing").catch(
    (cause: unknown) => cause,
  )
  assert.deepEqual(error, new OgNotFound({ slug: "docs/v4/missing" }))
})
