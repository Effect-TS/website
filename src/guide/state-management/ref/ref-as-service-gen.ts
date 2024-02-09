import { Effect, Context, Ref } from "effect"

// Create a Tag for our state
class MyState extends Context.Tag("MyState")<MyState, Ref.Ref<number>>() {}

// Subprogram 1: Increment the state value twice
// $ExpectType Effect<void, never, MyState>
const subprogram1 = Effect.gen(function* (_) {
  const state = yield* _(MyState)
  yield* _(Ref.update(state, (n) => n + 1))
  yield* _(Ref.update(state, (n) => n + 1))
})

// Subprogram 2: Decrement the state value and then increment it
// $ExpectType Effect<void, never, MyState>
const subprogram2 = Effect.gen(function* (_) {
  const state = yield* _(MyState)
  yield* _(Ref.update(state, (n) => n - 1))
  yield* _(Ref.update(state, (n) => n + 1))
})

// Subprogram 3: Read and log the current value of the state
// $ExpectType Effect<void, never, MyState>
const subprogram3 = Effect.gen(function* (_) {
  const state = yield* _(MyState)
  const value = yield* _(Ref.get(state))
  console.log(`MyState has a value of ${value}.`)
})

// Compose subprograms 1, 2, and 3 to create the main program
// $ExpectType Effect<void, never, MyState>
const program = Effect.gen(function* (_) {
  yield* _(subprogram1)
  yield* _(subprogram2)
  yield* _(subprogram3)
})

// Create a Ref instance with an initial value of 0
// $ExpectType Effect<Ref<number>, never, never>
const initialState = Ref.make(0)

// Provide the Ref as a service
// $ExpectType Effect<void, never, never>
const runnable = Effect.provideServiceEffect(program, MyState, initialState)

// Run the program and observe the output
Effect.runPromise(runnable)
/*
Output:
MyState has a value of 2.
*/
