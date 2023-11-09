import { Logger, Scope, Layer, Effect, Runtime, Exit } from "effect"

// Define a configuration layer
const appLayer = Logger.replace(
  Logger.defaultLogger,
  Logger.make(({ message }) => console.log(message))
)

// Create a scope for resources used in the configuration layer
const scope = Effect.runSync(Scope.make())

// Transform the configuration layer into a runtime
const runtime = await Effect.runPromise(
  Layer.toRuntime(appLayer).pipe(Scope.extend(scope))
)

// Define a custom running function
const runSync = Runtime.runSync(runtime)

const program = Effect.log("Application started!")

// Execute the program using the custom runtime
runSync(program)
/*
Output:
Application started!
*/

// Cleaning up any resources used by the configuration layer
Effect.runFork(Scope.close(scope, Exit.unit))
