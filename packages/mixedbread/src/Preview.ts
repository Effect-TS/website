import * as Data from "effect/Data"
import * as Effect from "effect/Effect"

export class PreviewError extends Data.TaggedError("PreviewError")<{
  readonly message: string
}> {}

export const stage = (
  pullRequest: number,
): Effect.Effect<string, PreviewError> =>
  Number.isSafeInteger(pullRequest) && pullRequest > 0
    ? Effect.succeed(`pr-${String(pullRequest)}`)
    : Effect.fail(
        new PreviewError({
          message: `Invalid pull request number: expected a positive integer, received ${String(pullRequest)}`,
        }),
      )
