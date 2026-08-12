---
title: Data
description: Define immutable data structures, ensure equality, and manage errors seamlessly with Effect's Data module.
sidebar:
  order: 4
---

import { Aside } from "@astrojs/starlight/components"

The Data module simplifies creating and handling data structures in TypeScript. It provides tools for **defining data types**, ensuring **equality** between objects, and **hashing** data for efficient comparisons.

## Value Equality

Plain JavaScript objects, arrays, tuples, `Map`s, and `Set`s get structural equality with `Equal.equals` by default. No special constructor is required. See [Equal](/docs/v4/trait/equal/) for the full explanation.

This means that two plain values are considered equal if they have the same structure and values.

### struct

In plain JavaScript, objects are considered equal only if they refer to the exact same instance.

**Example** (Comparing Two Objects in Plain JavaScript)

```ts twoslash
const alice = { name: "Alice", age: 30 }

// This comparison is false because they are different instances
// @errors: 2839
console.log(alice === { name: "Alice", age: 30 }) // Output: false
```

However, `Equal.equals` lets you compare the same two objects based on their structure and content.

**Example** (Checking Equality of Plain Objects)

```ts twoslash import.meta.vitest name="struct-1"
import { Equal } from "effect"

//      ┌─── { readonly name: string; readonly age: number; }
//      ▼
const alice = { name: "Alice", age: 30 }

// Check if Alice is equal to a new object
// with the same structure and values
console.log(Equal.equals(alice, { name: "Alice", age: 30 }))
Equal.equals(alice, { name: "Alice", age: 30 }) // => true
```

The comparison performed by `Equal.equals` is **deep**: nested objects are compared recursively, with no extra work required.

**Example** (Deep Comparison of Nested Objects)

```ts twoslash import.meta.vitest name="struct-2"
import { Equal } from "effect"

const nested = { name: "Alice", nested_field: { value: 42 } }

// Nested objects are compared recursively, so this is true
console.log(
  Equal.equals(nested, { name: "Alice", nested_field: { value: 42 } }),
)
Equal.equals(nested, { name: "Alice", nested_field: { value: 42 } }) // => true
```

A different nested value makes the objects unequal, as you would expect.

**Example** (Nested Objects with Different Values)

```ts twoslash import.meta.vitest name="struct-3"
import { Equal } from "effect"

const nested = { name: "Alice", nested_field: { value: 42 } }

console.log(
  Equal.equals(nested, { name: "Alice", nested_field: { value: 43 } }),
)
Equal.equals(nested, { name: "Alice", nested_field: { value: 43 } }) // => false
```

### tuple

Plain arrays used as tuples are compared structurally as well.

**Example** (Checking Equality of Tuples)

```ts twoslash import.meta.vitest name="tuple-1"
import { Equal } from "effect"

//      ┌─── readonly [string, number]
//      ▼
const alice = ["Alice", 30] as const

// Check if Alice is equal to a new tuple
// with the same structure and values
console.log(Equal.equals(alice, ["Alice", 30]))
Equal.equals(alice, ["Alice", 30]) // => true
```

<Aside type="tip" title="Deep Comparison">
  `Equal.equals` compares arrays and tuples recursively, including any nested
  objects or arrays, with no extra work required.
</Aside>

### array

Plain arrays support structural equality too.

**Example** (Checking Equality of Arrays)

```ts twoslash import.meta.vitest name="array-1"
import { Equal } from "effect"

//      ┌─── readonly number[]
//      ▼
const numbers = [1, 2, 3, 4, 5]

// Check if the array is equal to a new array
// with the same values
console.log(Equal.equals(numbers, [1, 2, 3, 4, 5]))
Equal.equals(numbers, [1, 2, 3, 4, 5]) // => true
```

<Aside type="tip" title="Deep Comparison">
  `Equal.equals` compares arrays and tuples recursively, including any nested
  objects or arrays, with no extra work required.
</Aside>

## Constructors

The module introduces a concept known as "Case classes", which automate various essential operations when defining data types.
These operations include generating **constructors**, handling **equality** checks, and managing **hashing**.

Case classes can be defined in two primary ways:

- as plain objects, using an ordinary factory function when you want a reusable constructor; equality and hashing come for free
- as TypeScript classes using `Class` or `TaggedClass`, when you want a class-oriented structure with methods and custom logic

### Constructor functions

A plain factory function that returns an object literal gives you a reusable constructor. Since plain objects have structural equality by default, no special helper is needed for equality or hashing.

**Example** (Defining a Constructor Function and Checking Equality)

In this example, a plain arrow function creates a constructor for `Person`. The resulting instances are plain objects, so they already support equality checks. You can compare them directly using `Equal.equals`.

```ts twoslash import.meta.vitest name="constructor-functions-1"
import { Equal } from "effect"

interface Person {
  readonly name: string
}

// Create a constructor for `Person`
//
//      ┌─── (args: Person) => Person
//      ▼
const make = (args: Person): Person => ({ ...args })

const alice = make({ name: "Alice" })

console.log(Equal.equals(alice, make({ name: "Alice" })))
Equal.equals(alice, make({ name: "Alice" })) // => true

console.log(Equal.equals(alice, make({ name: "John" })))
Equal.equals(alice, make({ name: "John" })) // => false
```

**Example** (Defining and Comparing Nested Data)

This example demonstrates nested data structures, such as a `Person` type containing an `Address`. Both `Person` and `Address` constructors return plain objects, so equality checks work out of the box.

```ts twoslash import.meta.vitest name="constructor-functions-2"
import { Equal } from "effect"

interface Address {
  readonly street: string
  readonly city: string
}

// Create a constructor for `Address`
const Address = (args: Address): Address => ({ ...args })

interface Person {
  readonly name: string
  readonly address: Address
}

// Create a constructor for `Person`
const Person = (args: Person): Person => ({ ...args })

const alice = Person({
  name: "Alice",
  address: Address({ street: "123 Main St", city: "Wonderland" }),
})

const anotherAlice = Person({
  name: "Alice",
  address: Address({ street: "123 Main St", city: "Wonderland" }),
})

console.log(Equal.equals(alice, anotherAlice))
Equal.equals(alice, anotherAlice) // => true
```

Since nested plain objects are also compared structurally by default, you don't even need a separate `Address` constructor. An inline object literal works just as well.

**Example** (Using a Plain Object Literal for Nested Data)

```ts twoslash import.meta.vitest name="constructor-functions-3"
import { Equal } from "effect"

interface Person {
  readonly name: string
  readonly address: {
    readonly street: string
    readonly city: string
  }
}

// Create a constructor for `Person`
const Person = (args: Person): Person => ({ ...args })

const alice = Person({
  name: "Alice",
  address: { street: "123 Main St", city: "Wonderland" },
})

const anotherAlice = Person({
  name: "Alice",
  address: { street: "123 Main St", city: "Wonderland" },
})

console.log(Equal.equals(alice, anotherAlice))
Equal.equals(alice, anotherAlice) // => true
```

**Example** (Defining and Comparing Recursive Data)

This example demonstrates a recursive structure defining a binary tree where each node can contain other nodes.

```ts twoslash import.meta.vitest name="constructor-functions-4"
import { Equal } from "effect"

interface BinaryTree<T> {
  readonly value: T
  readonly left: BinaryTree<T> | null
  readonly right: BinaryTree<T> | null
}

// Create a constructor for `BinaryTree<number>`
const BinaryTree = (args: BinaryTree<number>): BinaryTree<number> => ({
  ...args,
})

const tree1 = BinaryTree({
  value: 0,
  left: BinaryTree({ value: 1, left: null, right: null }),
  right: null,
})

const tree2 = BinaryTree({
  value: 0,
  left: BinaryTree({ value: 1, left: null, right: null }),
  right: null,
})

console.log(Equal.equals(tree1, tree2))
Equal.equals(tree1, tree2) // => true
```

### Tagged constructor functions

When you're working with a data type that includes a tag field, like in disjoint union types, defining the tag manually for each instance can get repetitive.

**Example** (Defining a Tagged Constructor Manually)

Here, we create a `Person` type with a `_tag` field. Notice that the `_tag` needs to be specified for every new instance.

```ts twoslash
interface Person {
  readonly _tag: "Person" // the tag
  readonly name: string
}

const Person = (args: Person): Person => ({ ...args })

// Repeating `_tag: 'Person'` for each instance
const alice = Person({ _tag: "Person", name: "Alice" })
const bob = Person({ _tag: "Person", name: "Bob" })
```

To streamline this process, write a constructor function that adds the tag automatically. It follows the convention in the Effect ecosystem of naming the tag field as `"_tag"`.

**Example** (Simplifying Tagging with a Constructor Function)

This way you define the tag just once, making instance creation simpler.

```ts twoslash import.meta.vitest name="tagged-constructor-functions-1"
interface Person {
  readonly _tag: "Person" // the tag
  readonly name: string
}

const Person = (args: Omit<Person, "_tag">): Person => ({
  ...args,
  _tag: "Person",
})

// The `_tag` field is automatically added
const alice = Person({ name: "Alice" })
const bob = Person({ name: "Bob" })

console.log(alice)
alice // => { name: "Alice", _tag: "Person" }
```

### Class

If you prefer working with classes instead of plain objects, you can use `Data.Class` as an alternative to a constructor function. This approach may feel more natural in scenarios where you want a class-oriented structure, complete with methods and custom logic.

**Example** (Using Data.Class for a Class-Oriented Structure)

Here's how to define a `Person` class using `Data.Class`:

```ts twoslash import.meta.vitest name="class-1"
import { Data, Equal } from "effect"

// Define a Person class extending Data.Class
class Person extends Data.Class<{ name: string }> {}

// Create an instance of Person
const alice = new Person({ name: "Alice" })

// Check for equality between two instances
console.log(Equal.equals(alice, new Person({ name: "Alice" })))
Equal.equals(alice, new Person({ name: "Alice" })) // => true
```

One of the benefits of using classes is that you can easily add custom methods and getters. This allows you to extend the functionality of your data types.

**Example** (Adding Custom Getters to a Class)

In this example, we add a `upperName` getter to the `Person` class to return the name in uppercase:

```ts twoslash import.meta.vitest name="class-2"
import { Data } from "effect"

// Extend Person class with a custom getter
class Person extends Data.Class<{ name: string }> {
  get upperName() {
    return this.name.toUpperCase()
  }
}

// Create an instance and use the custom getter
const alice = new Person({ name: "Alice" })

console.log(alice.upperName)
alice.upperName // => "ALICE"
```

### TaggedClass

If you prefer a class-based approach but also want the benefits of tagging for disjoint unions, `Data.TaggedClass` can be a helpful option. It works similarly to `tagged` but is tailored for class definitions.

**Example** (Defining a Tagged Class with Built-In Tagging)

Here's how to define a `Person` class using `Data.TaggedClass`. Notice that the tag `"Person"` is automatically added:

```ts twoslash import.meta.vitest name="tagged-class-1"
import { Data, Equal } from "effect"

// Define a tagged class Person with the _tag "Person"
class Person extends Data.TaggedClass("Person")<{ name: string }> {}

// Create an instance of Person
const alice = new Person({ name: "Alice" })

console.log(alice)
// Output: Person { name: 'Alice', _tag: 'Person' }
alice._tag // => "Person"

// Check equality between two instances
console.log(Equal.equals(alice, new Person({ name: "Alice" })))
Equal.equals(alice, new Person({ name: "Alice" })) // => true
```

One benefit of using tagged classes is the ability to easily add custom methods and getters, extending the class's functionality as needed.

**Example** (Adding Custom Getters to a Tagged Class)

In this example, we add a `upperName` getter to the `Person` class, which returns the name in uppercase:

```ts twoslash import.meta.vitest name="tagged-class-2"
import { Data } from "effect"

// Extend the Person class with a custom getter
class Person extends Data.TaggedClass("Person")<{ name: string }> {
  get upperName() {
    return this.name.toUpperCase()
  }
}

// Create an instance and use the custom getter
const alice = new Person({ name: "Alice" })

console.log(alice.upperName)
alice.upperName // => "ALICE"
```

## Union of Tagged Structs

To create a disjoint union of tagged structs, you can use `Data.TaggedEnum` and `Data.taggedEnum`. These utilities make it straightforward to define and work with unions of plain objects.

### Definition

The type passed to `Data.TaggedEnum` must be an object where the keys represent the tags,
and the values define the structure of the corresponding data types.

**Example** (Defining a Tagged Union and Checking Equality)

```ts twoslash import.meta.vitest name="definition-1"
import { Data, Equal } from "effect"

// Define a union type using TaggedEnum
type RemoteData = Data.TaggedEnum<{
  Loading: {}
  Success: { readonly data: string }
  Failure: { readonly reason: string }
}>

// Create constructors for each case in the union
const { Loading, Success, Failure } = Data.taggedEnum<RemoteData>()

// Instantiate different states
const state1 = Loading()
const state2 = Success({ data: "test" })
const state3 = Success({ data: "test" })
const state4 = Failure({ reason: "not found" })

// Check equality between states
console.log(Equal.equals(state2, state3))
Equal.equals(state2, state3) // => true
console.log(Equal.equals(state2, state4))
Equal.equals(state2, state4) // => false

// Display the states
console.log(state1)
state1 // => { _tag: "Loading" }
console.log(state2)
state2 // => { data: "test", _tag: "Success" }
console.log(state4)
state4 // => { reason: "not found", _tag: "Failure" }
```

<Aside type="note" title="Tag Field Naming Convention">
  The tag field `"_tag"` is used to identify the type of each state, following
  Effect's naming convention.
</Aside>

### $is and $match

The `Data.taggedEnum` provides `$is` and `$match` functions for convenient type guarding and pattern matching.

**Example** (Using Type Guards and Pattern Matching)

```ts twoslash import.meta.vitest name="is-and-match-1"
import { Data } from "effect"

type RemoteData = Data.TaggedEnum<{
  Loading: {}
  Success: { readonly data: string }
  Failure: { readonly reason: string }
}>

const { $is, $match, Loading, Success } = Data.taggedEnum<RemoteData>()

// Use `$is` to create a type guard for "Loading"
const isLoading = $is("Loading")

console.log(isLoading(Loading()))
isLoading(Loading()) // => true
console.log(isLoading(Success({ data: "test" })))
isLoading(Success({ data: "test" })) // => false

// Use `$match` for pattern matching
const matcher = $match({
  Loading: () => "this is a Loading",
  Success: ({ data }) => `this is a Success: ${data}`,
  Failure: ({ reason }) => `this is a Failure: ${reason}`,
})

console.log(matcher(Success({ data: "test" })))
matcher(Success({ data: "test" })) // => "this is a Success: test"
```

### Adding Generics

You can create more flexible and reusable tagged unions by using `TaggedEnum.WithGenerics`. This approach allows you to define tagged unions that can handle different types dynamically.

**Example** (Using Generics with TaggedEnum)

```ts twoslash import.meta.vitest name="adding-generics-1"
import { Data } from "effect"

// Define a generic TaggedEnum for RemoteData
type RemoteData<Success, Failure> = Data.TaggedEnum<{
  Loading: {}
  Success: { data: Success }
  Failure: { reason: Failure }
}>

// Extend TaggedEnum.WithGenerics to add generics
interface RemoteDataDefinition extends Data.TaggedEnum.WithGenerics<2> {
  readonly taggedEnum: RemoteData<this["A"], this["B"]>
}

// Create constructors for the generic RemoteData
const { Loading, Failure, Success } = Data.taggedEnum<RemoteDataDefinition>()

// Instantiate each case with specific types
const loading = Loading()
const failure = Failure({ reason: "not found" })
const success = Success({ data: 1 })

success.data // => 1
```

## Errors

In Effect, handling errors is simplified using specialized constructors:

- `Error`
- `TaggedError`

These constructors make defining custom error types straightforward, while also providing useful integrations like equality checks and structured error handling.

### Error

`Data.Error` lets you create an `Error` type with extra fields beyond the typical `message` property.

**Example** (Creating a Custom Error with Additional Fields)

```ts twoslash import.meta.vitest name="error-1"
import { Data } from "effect"

// Define a custom error with additional fields
class NotFound extends Data.Error<{ message: string; file: string }> {}

// Create an instance of the custom error
const err = new NotFound({
  message: "Cannot find this file",
  file: "foo.txt",
})

console.log(err instanceof Error)
err instanceof Error // => true

console.log(err.file)
err.file // => "foo.txt"
console.log(err)
err.message // => "Cannot find this file"
```

You can yield an instance of `NotFound` directly in an [Effect.gen](/docs/v4/getting-started/using-generators/), without needing to use `Effect.fail`.

**Example** (Yielding a Custom Error in `Effect.gen`)

```ts twoslash
import { Data, Effect } from "effect"

class NotFound extends Data.Error<{ message: string; file: string }> {}

const program = Effect.gen(function* () {
  yield* new NotFound({
    message: "Cannot find this file",
    file: "foo.txt",
  })
})

Effect.runPromise(program)
/*
throws:
NotFound [Error]: Cannot find this file
    ...stack trace... {
  file: 'foo.txt'
}
*/
```

### TaggedError

Effect provides a `TaggedError` API to add a `_tag` field automatically to your custom errors. This simplifies error handling with APIs like [Effect.catchTag](/docs/v4/error-management/expected-errors/#catchtag) or [Effect.catchTags](/docs/v4/error-management/expected-errors/#catchtags).

```ts twoslash import.meta.vitest name="tagged-error-1"
import { Data, Effect, Console } from "effect"

// Define a custom tagged error
class NotFound extends Data.TaggedError("NotFound")<{
  message: string
  file: string
}> {}

const program = Effect.gen(function* () {
  return yield* new NotFound({
    message: "Cannot find this file",
    file: "foo.txt",
  })
}).pipe(
  // Catch and handle the tagged error
  Effect.catchTag("NotFound", (err) =>
    Console.error(`${err.message} (${err.file})`),
  ),
)

await Effect.runPromise(program) // => undefined
// Output: Cannot find this file (foo.txt)
```

### Native Cause Support

Errors created using `Data.Error` or `Data.TaggedError` can include a `cause` property, integrating with the native `cause` feature of JavaScript's `Error` for more detailed error tracing.

**Example** (Using the `cause` Property)

```ts twoslash {22}
import { Data, Effect } from "effect"

// Define an error with a cause property
class MyError extends Data.Error<{ cause: Error }> {}

const program = Effect.gen(function* () {
  yield* new MyError({
    cause: new Error("Something went wrong"),
  })
})

Effect.runPromise(program)
/*
throws:
MyError
    ...stack trace... {
  [cause]: Error: Something went wrong
      ...stack trace...
}
*/
```
