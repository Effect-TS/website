import * as Effect from "effect/Effect"
import { assert, test } from "vite-plus/test"
import * as Preview from "../src/Preview.ts"

test("creates a preview stage from a pull request number", () => {
  assert.equal(Effect.runSync(Preview.stage(123)), "pr-123")
})

test("rejects invalid pull request numbers", () => {
  for (const pullRequest of [0, -1, 1.5, Number.NaN]) {
    const error = Effect.runSync(Effect.flip(Preview.stage(pullRequest)))
    assert.instanceOf(error, Preview.PreviewError)
  }
})
