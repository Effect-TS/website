import { Effect } from "effect"

Effect.map(Effect.succeed(1), (n) => n + 1)
