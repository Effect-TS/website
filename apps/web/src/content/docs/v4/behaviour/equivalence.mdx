---
title: Equivalence
description: Define and customize equivalence relations for TypeScript values.
sidebar:
  order: 0
---

The Equivalence module provides a way to define equivalence relations between values in TypeScript. An equivalence relation is a binary relation that is reflexive, symmetric, and transitive, establishing a formal notion of when two values should be considered equivalent.

## What is Equivalence?

An `Equivalence<A>` represents a function that compares two values of type `A` and determines if they are equivalent. This is more flexible and customizable than simple equality checks using `===`.

Here's the structure of an `Equivalence`:

```ts showLineNumbers=false
interface Equivalence<A> {
  (self: A, that: A): boolean
}
```

## Using Built-in Equivalences

The module provides several built-in equivalence relations for common data types:

| Equivalence             | Description                                 |
| ----------------------- | ------------------------------------------- |
| `String`                | Uses strict equality (`===`) for strings    |
| `Number`                | Uses strict equality (`===`) for numbers    |
| `Boolean`               | Uses strict equality (`===`) for booleans   |
| `strictEqual<symbol>()` | Uses strict equality (`===`) for symbols    |
| `BigInt`                | Uses strict equality (`===`) for bigints    |
| `Date`                  | Compares `Date` objects by their timestamps |

**Example** (Using Built-in Equivalences)

```ts twoslash import.meta.vitest name="using-built-in-equivalences-1"
import { Equivalence } from "effect"

console.log(Equivalence.String("apple", "apple"))
Equivalence.String("apple", "apple") // => true

console.log(Equivalence.String("apple", "orange"))
Equivalence.String("apple", "orange") // => false

console.log(Equivalence.Date(new Date(2023, 1, 1), new Date(2023, 1, 1)))
Equivalence.Date(new Date(2023, 1, 1), new Date(2023, 1, 1)) // => true

console.log(Equivalence.Date(new Date(2023, 1, 1), new Date(2023, 10, 1)))
Equivalence.Date(new Date(2023, 1, 1), new Date(2023, 10, 1)) // => false
```

## Deriving Equivalences

For more complex data structures, you may need custom equivalences. The Equivalence module lets you derive new `Equivalence` instances from existing ones with the `Equivalence.mapInput` function.

**Example** (Creating a Custom Equivalence for Objects)

```ts twoslash import.meta.vitest name="deriving-equivalences-1"
import { Equivalence } from "effect"

interface User {
  readonly id: number
  readonly name: string
}

// Create an equivalence that compares User objects based only on the id
const equivalence = Equivalence.mapInput(
  Equivalence.Number, // Base equivalence for comparing numbers
  (user: User) => user.id, // Function to extract the id from a User
)

// Compare two User objects: they are equivalent if their ids are the same
console.log(equivalence({ id: 1, name: "Alice" }, { id: 1, name: "Al" }))
equivalence({ id: 1, name: "Alice" }, { id: 1, name: "Al" }) // => true
```

The `Equivalence.mapInput` function takes two arguments:

1. The existing `Equivalence` you want to use as a base (`Equivalence.Number` in this case, for comparing numbers).
2. A function that extracts the value used for the equivalence check from your data structure (`(user: User) => user.id` in this case).
