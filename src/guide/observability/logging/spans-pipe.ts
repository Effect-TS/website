import { Effect } from "effect"

// $ExpectType Effect<never, never, void>
const program = Effect.sleep("1 seconds").pipe(
  Effect.flatMap(() => Effect.log("The job is finished!")),
  Effect.withLogSpan("myspan")
)

Effect.runPromise(program)
/*
timestamp=... level=INFO fiber=#0 message="The job is finished!" myspan=1011ms
*/
