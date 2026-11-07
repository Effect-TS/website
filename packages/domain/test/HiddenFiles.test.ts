import * as Effect from "effect/Effect"
import { assert, test } from "vite-plus/test"
import { HiddenFiles } from "../src/index.ts"

const ids = (count: number) =>
  Array.from(
    { length: count },
    (_, index) => `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
  )

test("encodes hidden file IDs in values below the metadata value limit", () => {
  const hidden = ids(600)

  const metadata = Effect.runSync(HiddenFiles.encode(hidden))

  const values = Object.values(metadata) as Array<string>
  assert.isTrue(values.length > 1)
  assert.isTrue(values.every((value) => value.length <= 6_000))
  assert.deepEqual(HiddenFiles.decode(metadata), [...hidden].sort())
})

test("encodes duplicate IDs once", () => {
  assert.deepEqual(
    HiddenFiles.decode(Effect.runSync(HiddenFiles.encode(["b", "a", "b"]))),
    ["a", "b"],
  )
})

test("decodes nothing from metadata without hidden files", () => {
  assert.deepEqual(
    HiddenFiles.decode({ lifecycle: "pull-request-preview" }),
    [],
  )
  assert.deepEqual(HiddenFiles.decode(null), [])
})

test("ignores hidden file values that are not strings", () => {
  assert.deepEqual(
    HiddenFiles.decode({ hidden_files_0: 1, hidden_files_1: "a,,b" }),
    ["a", "b"],
  )
})

test("fails when hidden file IDs exceed the metadata budget", () => {
  const error = Effect.runSync(Effect.flip(HiddenFiles.encode(ids(4_000))))

  assert.include(error.message, "4000 hidden files")
})

test("recognizes the keys it writes", () => {
  const keys = Object.keys(Effect.runSync(HiddenFiles.encode(ids(1))))

  assert.deepEqual(keys.filter(HiddenFiles.isKey), keys)
  assert.isFalse(HiddenFiles.isKey("lifecycle"))
})
