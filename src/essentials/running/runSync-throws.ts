import { Effect } from "effect"

Effect.runSync(Effect.fail("error")) // throws

Effect.runSync(Effect.promise(() => Promise.resolve(1))) // throws
