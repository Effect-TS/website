import { Effect, pipe } from "effect"

// Define a user interface
interface User {
  readonly name: string
}

// Assume an asynchronous authentication function
declare const auth: () => Promise<User | null>

// $ExpectType Effect<never, Error, string>
const program = pipe(
  Effect.promise(() => auth()),
  Effect.filterOrFail(
    // Define a guard to narrow down the type
    (user): user is User => user !== null,
    () => new Error("Unauthorized")
  ),
  Effect.map((user) => user.name) // The 'user' here has type `User`, not `User | null`
)
