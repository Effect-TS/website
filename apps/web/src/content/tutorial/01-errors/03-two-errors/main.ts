import { Data, Effect } from "effect"

export class NotFound extends Data.TaggedError("NotFound") {}
export class Forbidden extends Data.TaggedError("Forbidden") {}

const failing: Effect.Effect<string, NotFound | Forbidden> = Effect.fail(
  new Forbidden(),
)

export const program = failing.pipe(
  Effect.catchTag("NotFound", () => Effect.succeed("guest")),
)
