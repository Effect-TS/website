import { Effect } from "effect"

// Effect<never, never, void>
const program = Effect.gen(function* (_) {
  yield* _(Effect.sleep("1 seconds"))
  yield* _(Effect.log("The job is finished!"))
}).pipe(Effect.withLogSpan("myspan"))

Effect.runPromise(program)
/*
timestamp=... level=INFO fiber=#0 message="The job is finished!" myspan=1011ms
*/
