import { assert, test } from "vite-plus/test"
import * as Effect from "effect/Effect"
import { AstroContent } from "../../src/lib/astro-content.ts"

test("a failing collection read becomes an AstroContentError", async () => {
  const error = await Effect.runPromise(
    Effect.gen(function* () {
      const content = yield* AstroContent
      return yield* content.collection("blogAuthors").pipe(Effect.flip)
    }).pipe(Effect.provide(AstroContent.layer)),
  )
  assert.equal(error._tag, "AstroContentError")
  assert.equal(error.collection, "blogAuthors")
})
