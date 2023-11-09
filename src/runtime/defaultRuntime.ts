import { Effect, Runtime } from "effect"

const program = Effect.log("Application started!")

Effect.runSync(program)
/*
Output:
... level=INFO fiber=#0 message="Application started!"
*/

Runtime.runSync(Runtime.defaultRuntime)(program)
/*
Output:
... level=INFO fiber=#0 message="Application started!"
*/
