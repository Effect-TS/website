import { Option } from "effect"

// Simulating a computation that may or may not produce a result
const performComputation = (): Option.Option<number> =>
  Math.random() < 0.5 ? Option.some(10) : Option.none()

const performAlternativeComputation = (): Option.Option<number> =>
  Math.random() < 0.5 ? Option.some(20) : Option.none()

// $ExpectType Option<number>
const result = performComputation().pipe(
  Option.orElse(() => performAlternativeComputation())
)

Option.match(result, {
  onNone: () => console.log("Both computations resulted in None"),
  onSome: (value) => console.log("Computed value:", value), // At least one computation succeeded
})
