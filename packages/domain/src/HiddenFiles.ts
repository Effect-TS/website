import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import * as Predicate from "effect/Predicate"
import * as Schema from "effect/Schema"
import * as SchemaIssue from "effect/SchemaIssue"
import * as SchemaTransformation from "effect/SchemaTransformation"

const KEY_PREFIX = "hidden_files_"
// Mixedbread documents 8 KiB per metadata value and 128 KiB per object.
const MAX_VALUE_LENGTH = 6_000
const MAX_TOTAL_LENGTH = 96 * 1024

export const isKey = (key: string): boolean => key.startsWith(KEY_PREFIX)

// Joins the sorted IDs with commas, starting a new value before one passes the
// limit.
const pack = (ids: ReadonlyArray<string>): ReadonlyArray<string> =>
  [...new Set(ids)].sort().reduce<Array<string>>((values, id) => {
    const last = values.at(-1)
    if (last !== undefined && last.length + 1 + id.length <= MAX_VALUE_LENGTH) {
      values[values.length - 1] = `${last},${id}`
    } else {
      values.push(id)
    }
    return values
  }, [])

// The production file IDs a preview store hides, as they are kept in the
// store's metadata.
export const FromMetadata = Schema.Record(Schema.String, Schema.Unknown).pipe(
  Schema.decodeTo(
    Schema.Array(Schema.String),
    SchemaTransformation.transformEffect<
      ReadonlyArray<string>,
      { readonly [key: string]: unknown }
    >({
      decode: (metadata) =>
        Effect.succeed(
          Object.entries(metadata)
            .flatMap(([key, value]) =>
              isKey(key) && Predicate.isString(value)
                ? value.split(",").filter((id) => id !== "")
                : [],
            )
            .sort(),
        ),
      encode: (ids) => {
        const values = pack(ids)
        const length = values.reduce((total, value) => total + value.length, 0)
        return length > MAX_TOTAL_LENGTH
          ? Effect.fail(
              new SchemaIssue.InvalidValue({
                message: `${ids.length} hidden files need ${length} characters of metadata; the limit is ${MAX_TOTAL_LENGTH}`,
              }),
            )
          : Effect.succeed(
              Object.fromEntries(
                values.map((value, index) => [`${KEY_PREFIX}${index}`, value]),
              ),
            )
      },
    }),
  ),
)

export const encode = Schema.encodeEffect(FromMetadata)

// Metadata that is missing or not an object hides nothing.
export const decode = (metadata: unknown): ReadonlyArray<string> =>
  Schema.decodeUnknownOption(FromMetadata)(metadata).pipe(
    Option.getOrElse((): ReadonlyArray<string> => []),
  )
