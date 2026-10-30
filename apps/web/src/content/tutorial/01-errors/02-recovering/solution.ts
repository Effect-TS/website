import { Data, Effect } from "effect"

export class NotFound extends Data.TaggedError("NotFound") {}

export const program = Effect.fail(new NotFound()).pipe(
  Effect.catchTag("NotFound", () => Effect.succeed("guest")),
)
