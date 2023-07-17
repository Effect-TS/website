import { Effect } from "effect"

Effect.runPromise(Effect.fail("error")) // rejects
