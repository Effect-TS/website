import { Effect } from "effect"

const program = Effect.log("Hello, World!")

Effect.runPromise(program)
