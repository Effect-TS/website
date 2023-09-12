import { Console, Effect, Runtime } from "effect"

const program = Console.log("Hello World!")

Effect.runSync(program) // Output: Hello World!

Runtime.runSync(Runtime.defaultRuntime)(program) // Output: Hello World!
