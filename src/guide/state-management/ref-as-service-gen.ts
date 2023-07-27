import { Effect, Context, Ref } from "effect"

// Define a custom type for our state
interface MyState extends Ref.Ref<number> {}

// Create a Tag for our state
const MyState = Context.Tag<MyState>()

// Subprogram 1: Increment the state value twice
// $ExpectType Effect<MyState, never, void>
const subprogram1 = Effect.gen(function* (_) {
  const state = yield* _(MyState)
  yield* _(Ref.update(state, (n) => n + 1))
  yield* _(Ref.update(state, (n) => n + 1))
})

// Subprogram 2: Decrement the state value and then increment it
// $ExpectType Effect<MyState, never, void>
const subprogram2 = Effect.gen(function* (_) {
  const state = yield* _(MyState)
  yield* _(Ref.update(state, (n) => n - 1))
  yield* _(Ref.update(state, (n) => n + 1))
})

// Subprogram 3: Read and log the current value of the state
// $ExpectType Effect<MyState, never, void>
const subprogram3 = Effect.gen(function* (_) {
  const state = yield* _(MyState)
  const value = yield* _(Ref.get(state))
  yield* _(Effect.log(`MyState has a value of ${value}.`))
})

// Compose subprograms 1, 2, and 3 to create the main program
// $ExpectType Effect<MyState, never, void>
const program = Effect.gen(function* (_) {
  yield* _(subprogram1)
  yield* _(subprogram2)
  yield* _(subprogram3)
})

// Create a Ref instance with an initial value of 0
// $ExpectType Effect<never, never, Ref<number>>
const initialState = Ref.make(0)

// Provide the Ref as a service
// $ExpectType Effect<never, never, void>
const runnable = Effect.provideServiceEffect(program, MyState, initialState)

// Run the program and observe the output
Effect.runFork(runnable)
/*
... message="MyState has a value of 2."
*/
