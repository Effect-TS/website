import { Effect } from "effect"

const result1 = Effect.runSyncExit(Effect.succeed(1))
console.log("%o", result1) // Output: { _tag: 'Success', value: 1 }

const result2 = Effect.runSyncExit(Effect.fail("error"))
console.log(result2) // Output: { _tag: 'Failure', cause: { _tag: 'Cause', errors: [ [Object] ] } }
