import * as Schema from "@effect/schema/Schema"

// To prevent bad actors from creating arbitrarily large playgrounds
// and attempting to share them, thus filling up our KV storage, we
// limit the size of shareable playgrounds to 128 KB.
export const PLAYGROUND_MAX_SHAREABLE_BYTES = 128 * 1000 // 128 kilobytes

export class MaxPlaygroundSizeExceeded extends Schema.TaggedError<MaxPlaygroundSizeExceeded>()(
  "MaxPlaygroundSizeExceeded",
  {}
) {
  readonly message = `The playground has exceeded the maximum shareable size limit of ${PLAYGROUND_MAX_SHAREABLE_BYTES / 1000} kilobytes`
}

export const isMaxPlaygroundSizeExceeded = Schema.is(MaxPlaygroundSizeExceeded)