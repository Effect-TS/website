import { Effect } from "effect"

Effect.runSyncExit(Effect.promise(() => Promise.resolve(1))) // throws
