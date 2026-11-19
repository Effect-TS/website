import { assert, it } from "tutorial-test"
import { ExpiredCardError, InvalidTokenError, NetworkError } from "./main"

const tagOf = (error: object): unknown => Reflect.get(error, "_tag")

it("each error carries a _tag with its own name", () => {
  assert.strictEqual(tagOf(new ExpiredCardError()), "ExpiredCardError")
  assert.strictEqual(tagOf(new InvalidTokenError()), "InvalidTokenError")
  assert.strictEqual(tagOf(new NetworkError()), "NetworkError")
})

it("the tags differ, so TypeScript can tell the errors apart", () => {
  const tags = [
    tagOf(new ExpiredCardError()),
    tagOf(new InvalidTokenError()),
    tagOf(new NetworkError()),
  ]
  assert.ok(
    tags.every((tag) => typeof tag === "string"),
    "the errors have no _tag yet",
  )
  assert.strictEqual(new Set(tags).size, 3)
})
