---
title: Result
description: Represent exclusive values as Success or Failure with the Result data type, enabling precise control flow in computations.
sidebar:
  order: 7
---

import { Aside } from "@astrojs/starlight/components"

The `Result` data type represents two exclusive values: a `Result<A, E>` can be a `Success` value or a `Failure` value, where `A` is the type of the `Success` value, and `E` is the type of the `Failure` value.

## Understanding Result and Exit

Result is primarily used as a **simple discriminated union** and is not recommended as the main result type for operations requiring detailed error information.

[Exit](/docs/v4/data-types/exit/) is the preferred **result type** within Effect for capturing comprehensive details about failures.
It encapsulates the outcomes of effectful computations, distinguishing between success and various failure modes, such as errors, defects and interruptions.

## Creating Results

You can create a `Result` using the `Result.succeed` and `Result.fail` constructors.

Use `Result.succeed` to create a `Success` value of type `A`.

**Example** (Creating a Success Value)

```ts twoslash import.meta.vitest name="creating-results-1"
import { Result } from "effect"

const successValue = Result.succeed(42)

console.log(successValue)
successValue // => Result.succeed(42)
```

Use `Result.fail` to create a `Failure` value of type `E`.

**Example** (Creating a Failure Value)

```ts twoslash import.meta.vitest name="creating-results-2"
import { Result } from "effect"

const failureValue = Result.fail("not a number")

console.log(failureValue)
failureValue // => Result.fail("not a number")
```

## Guards

Use `Result.isFailure` and `Result.isSuccess` to check whether a `Result` is a `Failure` or `Success` value.

**Example** (Using Guards to Check the Type of Result)

```ts twoslash import.meta.vitest name="guards-1"
import { Result } from "effect"

const foo = Result.succeed(42)

if (Result.isFailure(foo)) {
  console.log(`The failure value is: ${foo.failure}`)
} else {
  console.log(`The Success value is: ${foo.success}`)
  foo.success // => 42
}
// Output: "The Success value is: 42"
```

## Pattern Matching

Use `Result.match` to handle both cases of a `Result` by specifying separate callbacks for `Failure` and `Success`.

**Example** (Pattern Matching with Result)

```ts twoslash import.meta.vitest name="pattern-matching-1"
import { Result } from "effect"

const foo = Result.succeed(42)

const message = Result.match(foo, {
  onFailure: (failure) => `The failure value is: ${failure}`,
  onSuccess: (success) => `The Success value is: ${success}`,
})

console.log(message)
message // => "The Success value is: 42"
```

## Mapping

### Mapping over the Success Value

Use `Result.map` to transform the `Success` value of a `Result`. The function you provide will only apply to the `Success` value, leaving any `Failure` value unchanged.

**Example** (Transforming the Success Value)

```ts twoslash import.meta.vitest name="mapping-over-the-success-value-1"
import { Result } from "effect"

// Transform the Success value by adding 1
const successResult = Result.map(Result.succeed(1), (n) => n + 1)
console.log(successResult)
successResult // => Result.succeed(2)

// The transformation is ignored for Failure values
const failureResult = Result.map(Result.fail("not a number"), (n) => n + 1)
console.log(failureResult)
failureResult // => Result.fail("not a number")
```

### Mapping over the Failure Value

Use `Result.mapError` to transform the `Failure` value of a `Result`. The provided function only applies to the `Failure` value, leaving any `Success` value unchanged.

**Example** (Transforming the Failure Value)

```ts twoslash import.meta.vitest name="mapping-over-the-failure-value-1"
import { Result } from "effect"

// The transformation is ignored for Success values
const successResult = Result.mapError(Result.succeed(1), (s) => s + "!")
console.log(successResult)
successResult // => Result.succeed(1)

// Transform the Failure value by appending "!"
const failureResult = Result.mapError(
  Result.fail("not a number"),
  (s) => s + "!",
)
console.log(failureResult)
failureResult // => Result.fail("not a number!")
```

### Mapping over Both Values

Use `Result.mapBoth` to transform both the `Failure` and `Success` values of a `Result`. This function takes two separate transformation functions: one for the `Failure` value and another for the `Success` value.

**Example** (Transforming Both Failure and Success Values)

```ts twoslash import.meta.vitest name="mapping-over-both-values-1"
import { Result } from "effect"

const transformedSuccess = Result.mapBoth(Result.succeed(1), {
  onFailure: (s) => s + "!",
  onSuccess: (n) => n + 1,
})
console.log(transformedSuccess)
transformedSuccess // => Result.succeed(2)

const transformedFailure = Result.mapBoth(Result.fail("not a number"), {
  onFailure: (s) => s + "!",
  onSuccess: (n) => n + 1,
})
console.log(transformedFailure)
transformedFailure // => Result.fail("not a number!")
```

## Interop with Effect

`Result` implements the `Yieldable` trait, so it can be yielded directly inside `Effect.gen`. To pass a `Result` to an Effect combinator such as `Effect.all`, convert it explicitly with `Effect.fromResult`.

### How Result Maps to Effect

| Result Variant | Mapped to Effect   | Description          |
| -------------- | ------------------ | -------------------- |
| `Failure<E>`   | `Effect<never, E>` | Represents a failure |
| `Success<A>`   | `Effect<A>`        | Represents a success |

**Example** (Combining `Result` with `Effect`)

```ts twoslash import.meta.vitest name="interop-with-effect-1"
import { Effect, Result } from "effect"

// Function to get the head of an array, returning Result
const head = <A>(array: ReadonlyArray<A>): Result.Result<A, string> =>
  array.length > 0 ? Result.succeed(array[0]!) : Result.fail("empty array")

head([1, 2, 3]) // => Result.succeed(1)

// Simulated fetch function that returns Effect
const fetchData = (): Effect.Effect<string, string> => {
  const success = Math.random() > 0.5
  return success
    ? Effect.succeed("some data")
    : Effect.fail("Failed to fetch data")
}

// Result is not an Effect subtype - convert explicitly with Effect.fromResult
const program = Effect.all([Effect.fromResult(head([1, 2, 3])), fetchData()])

Effect.runPromise(program).then(console.log, console.error)
/*
Example Output:
[ 1, 'some data' ]
*/
```

## Combining Two or More Results

### Combining with flatMap and map

Combine two `Result` values with a provided function by chaining `Result.flatMap` and `Result.map`. This creates a new `Result` that holds the combined value of both original `Result` values.

**Example** (Combining Two Results into an Object)

```ts twoslash import.meta.vitest name="combining-with-flatmap-and-map-1"
import { Result } from "effect"

const maybeName: Result.Result<string, string> = Result.succeed("John")
const maybeAge: Result.Result<number, string> = Result.succeed(25)

// Combine the name and age into a person object
const person = Result.flatMap(maybeName, (name) =>
  Result.map(maybeAge, (age) => ({
    name: name.toUpperCase(),
    age,
  })),
)

console.log(person)
person // => Result.succeed({ name: "JOHN", age: 25 })
```

If either of the `Result` values is a `Failure`, the result will be a `Failure`, holding the first encountered `Failure` value:

**Example** (Combining Results with a Failure Value)

```ts twoslash {4}
import { Result } from "effect"

const maybeName: Result.Result<string, string> = Result.succeed("John")
const maybeAge: Result.Result<number, string> = Result.fail("Oh no!")

// Since maybeAge is a Failure, the result will also be a Failure
const person = Result.flatMap(maybeName, (name) =>
  Result.map(maybeAge, (age) => ({
    name: name.toUpperCase(),
    age,
  })),
)

console.log(person)
/*
Output:
{ _id: 'Result', _tag: 'Failure', failure: 'Oh no!' }
*/
```

### all

To combine multiple `Result` values without transforming their contents, you can use `Result.all`. This function returns a `Result` with a structure matching the input:

- If you pass a tuple, the result will be a tuple of the same length.
- If you pass a struct, the result will be a struct with the same keys.
- If you pass an `Iterable`, the result will be an array.

**Example** (Combining Multiple Results into a Tuple and Struct)

```ts twoslash import.meta.vitest name="all-1"
import { Result } from "effect"

const maybeName: Result.Result<string, string> = Result.succeed("John")
const maybeAge: Result.Result<number, string> = Result.succeed(25)

//      ┌─── Result<[string, number], string>
//      ▼
const tuple = Result.all([maybeName, maybeAge])
console.log(tuple)
tuple // => Result.succeed(["John", 25])

//      ┌─── Result<{ name: string; age: number; }, string>
//      ▼
const struct = Result.all({ name: maybeName, age: maybeAge })
console.log(struct)
struct // => Result.succeed({ name: "John", age: 25 })
```

If one or more `Result` values are a `Failure`, the first `Failure` encountered is returned:

**Example** (Handling Multiple Failure Values)

```ts import.meta.vitest name="all-2"
import { Result } from "effect"

const maybeName: Result.Result<string, string> = Result.fail("name not found")
const maybeAge: Result.Result<number, string> = Result.fail("age not found")

// The first Failure value will be returned
console.log(Result.all([maybeName, maybeAge]))
Result.all([maybeName, maybeAge]) // => Result.fail("name not found")
```

## gen

Similar to [Effect.gen](/docs/v4/getting-started/using-generators/), `Result.gen` provides a more readable, generator-based syntax for working with `Result` values, making code that involves `Result` easier to write and understand. This approach is similar to using `async/await` but tailored for `Result`.

**Example** (Using `Result.gen` to Create a Combined Value)

```ts twoslash import.meta.vitest name="gen-1"
import { Result } from "effect"

const maybeName: Result.Result<string, string> = Result.succeed("John")
const maybeAge: Result.Result<number, string> = Result.succeed(25)

const program = Result.gen(function* () {
  const name = (yield* maybeName).toUpperCase()
  const age = yield* maybeAge
  return { name, age }
})

console.log(program)
program // => Result.succeed({ name: "JOHN", age: 25 })
```

When any of the `Result` values in the sequence is a `Failure`, the generator immediately returns the `Failure` value, skipping further operations:

**Example** (Handling a `Failure` Value with `Result.gen`)

In this example, `Result.gen` halts execution as soon as it encounters the `Failure` value, effectively propagating the error without performing further operations.

```ts twoslash import.meta.vitest name="gen-2"
import { Result } from "effect"

const maybeName: Result.Result<string, string> = Result.fail("Oh no!")
const maybeAge: Result.Result<number, string> = Result.succeed(25)

const program = Result.gen(function* () {
  console.log("Retrieving name...")
  const name = (yield* maybeName).toUpperCase()
  console.log("Retrieving age...")
  const age = yield* maybeAge
  return { name, age }
})

console.log(program)
/*
Output:
Retrieving name...
*/
program // => Result.fail("Oh no!")
```

The use of `console.log` in these example is for demonstration purposes only. When using `Result.gen`, avoid including side effects in your generator functions, as `Result` should remain a pure data structure.
