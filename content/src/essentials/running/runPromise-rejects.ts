import { Effect } from "effect"

Effect.runPromise(Effect.fail("my error")) // rejects
