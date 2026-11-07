import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import * as Predicate from "effect/Predicate"
import * as Schema from "effect/Schema"

const KEY_PREFIX = "hidden_files_"
// Mixedbread documents 8 KiB per metadata value and 128 KiB per object.
const MAX_VALUE_LENGTH = 6_000
const MAX_TOTAL_LENGTH = 96 * 1024

export class HiddenFilesTooLargeError extends Data.TaggedError(
  "HiddenFilesTooLargeError",
)<{
  readonly count: number
  readonly length: number
}> {}

export const isKey = (key: string): boolean => key.startsWith(KEY_PREFIX)

export const encode = (
  ids: ReadonlyArray<string>,
): Effect.Effect<Record<string, string>, HiddenFilesTooLargeError> =>
  Effect.suspend(() => {
    const sorted = [...new Set(ids)].sort()
    const values: Array<string> = []
    let current = ""
    for (const id of sorted) {
      const next = current === "" ? id : `${current},${id}`
      if (next.length > MAX_VALUE_LENGTH) {
        values.push(current)
        current = id
      } else {
        current = next
      }
    }
    if (current !== "") values.push(current)
    const length = values.reduce((total, value) => total + value.length, 0)
    return length > MAX_TOTAL_LENGTH
      ? Effect.fail(
          new HiddenFilesTooLargeError({ count: sorted.length, length }),
        )
      : Effect.succeed(
          Object.fromEntries(
            values.map((value, index) => [`${KEY_PREFIX}${index}`, value]),
          ),
        )
  })

const Metadata = Schema.Record(Schema.String, Schema.Unknown)
const decodeMetadata = Schema.decodeUnknownOption(Metadata)

export const decode = (metadata: unknown): ReadonlyArray<string> =>
  decodeMetadata(metadata).pipe(
    Option.match({
      onNone: () => [],
      onSome: (record) =>
        Object.entries(record)
          .flatMap(([key, value]) =>
            isKey(key) && Predicate.isString(value)
              ? value.split(",").filter((id) => id !== "")
              : [],
          )
          .sort(),
    }),
  )
