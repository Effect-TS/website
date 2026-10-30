import { Data, Effect } from "effect"

export class NotFound extends Data.TaggedError("NotFound") {}

export const program = Effect.succeed("user 1")
