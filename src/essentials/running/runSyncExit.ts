import { Effect } from "effect"

Effect.runSyncExit(Effect.succeed(1)) // Exit.succeed(1)

Effect.runSyncExit(Effect.fail("error")) // Exit.fail(...)
