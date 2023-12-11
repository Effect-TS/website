import { Effect } from "effect"

Effect.runSync(Effect.fail("my error")) // throws

Effect.runSync(Effect.promise(() => Promise.resolve(1))) // throws
