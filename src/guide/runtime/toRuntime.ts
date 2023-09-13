import { Logger, Layer, Effect, Runtime } from "effect"

const appLayer = Logger.replace(
  Logger.defaultLogger,
  Logger.make(({ message }) => console.log(message))
)

const runtime = Effect.runSync(Effect.scoped(Layer.toRuntime(appLayer)))

const myrunSync = Runtime.runSync(runtime)

const program = Effect.log("Application started!")

myrunSync(program)
/*
Output:
Application started!
*/
