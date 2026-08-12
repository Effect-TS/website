---
title: Equal
description: Implement value-based equality checks for improved data integrity and predictable behavior in TypeScript.
sidebar:
  order: 0
---

The Equal module provides a simple and convenient way to define and check for equality between two values in TypeScript.

Here are some key reasons why Effect exports an Equal module:

1. **Value-Based Equality by Default**: JavaScript's native equality operators (`===` and `==`) check for equality by reference, meaning they compare objects based on their memory addresses rather than their content. This behavior can be problematic when you want to compare objects with the same values but different references. The `Equal.equals` function solves this for the common cases out of the box: plain objects, arrays, `Map`, `Set`, `Date`, and `RegExp` are compared structurally, without any extra setup.

2. **Custom Equality**: Sometimes structural comparison isn't what you want, for example when equality should depend on only part of a value. The Equal module enables developers to implement custom equality checks for their data types and classes. By implementing the `Equal` interface, developers can define their own equality logic.

3. **Data Integrity**: In some applications, maintaining data integrity is crucial. The ability to perform value-based equality checks ensures that identical data is not duplicated within collections like sets or maps. This can lead to more efficient memory usage and more predictable behavior.

4. **Predictable Behavior**: The Equal module promotes more predictable behavior when comparing objects. Structural values are compared consistently by content, custom types are compared using the logic they define, and you can still opt individual objects into reference equality when that's genuinely what you need.

## How to Perform Equality Checking in Effect

In Effect it's advisable to **stop using** JavaScript's `===` and `==` operators and instead rely on the `Equal.equals` function.
This function can work with any data type that implements the `Equal` interface.
Some examples of such data types include [Option](/docs/v4/data-types/option/), [Result](/docs/v4/data-types/result/), [HashSet](/docs/v4/api/effect/HashSet), and [HashMap](/docs/v4/api/effect/HashMap).

By default, `Equal.equals` performs a deep structural comparison. Plain objects, arrays, `Map`s, `Set`s, `Date`s, and `RegExp`s are compared by their contents, not their reference, even if they don't implement the `Equal` interface:

**Example** (Using `Equal.equals` with the Default Structural Comparison)

```ts twoslash import.meta.vitest name="how-to-perform-equality-checking-in-effect-1"
import { Equal } from "effect"

// Two objects with identical properties and values
const a = { name: "Alice", age: 30 }
const b = { name: "Alice", age: 30 }

// Equal.equals compares plain objects structurally by default
console.log(Equal.equals(a, b))
Equal.equals(a, b) // => true
```

In this example, `a` and `b` are two separate objects with the same contents. `===` would consider them different because they occupy different memory locations, but `Equal.equals` reports them as equal because plain objects are compared structurally by default.

Structural comparison isn't always what you want, though. Sometimes equality should depend on only part of a value (for example, an identifier) while ignoring the rest, or you may need `Equal.equals` to compare a specific object by reference instead of by value. There are two ways to change the default behavior:

1. **Implementing the `Equal` Interface**: This method is useful when you need to define custom equality logic.

2. **Opting Into Reference Equality**: Mark specific objects so `Equal.equals` compares them by reference instead of structurally.

Let's explore both.

### Implementing the Equal Interface

To create custom equality behavior, you can implement the `Equal` interface in your models. This interface extends the `Hash` interface from the [Hash](/docs/v4/trait/hash/) module.

**Example** (Implementing `Equal` and `Hash` to Ignore an Irrelevant Field)

```ts twoslash import.meta.vitest name="implementing-the-equal-interface-1"
import { Equal, Hash } from "effect"

class Person implements Equal.Equal {
  constructor(
    readonly id: number, // Unique identifier
    readonly name: string,
    readonly age: number,
    readonly updatedAt: Date, // Changes on every edit, irrelevant to identity
  ) {}

  // Define equality based on id, name, and age only
  [Equal.symbol](that: Equal.Equal): boolean {
    if (that instanceof Person) {
      return (
        Equal.equals(this.id, that.id) &&
        Equal.equals(this.name, that.name) &&
        Equal.equals(this.age, that.age)
      )
    }
    return false
  }

  // Generate a hash code based on the unique id
  [Hash.symbol](): number {
    return Hash.hash(this.id)
  }
}

// Two Person instances with the same id, name, and age, but different updatedAt,
// are considered equal because updatedAt is ignored by [Equal.symbol]
Equal.equals(
  new Person(1, "Alice", 30, new Date("2024-01-01")),
  new Person(1, "Alice", 30, new Date("2024-06-01")),
) // => true
```

Without a custom implementation, the default structural comparison would also take `updatedAt` into account, so two records for the same person captured at different times would count as different. The `[Equal.symbol]` method above defines equality based on `id`, `name`, and `age` only, ignoring `updatedAt`. The `Hash` interface optimizes equality checks by comparing hash values instead of the objects themselves. When you use the `Equal.equals` function to compare two objects, it first checks if their hash values are equal. If not, it quickly determines that the objects are not equal, avoiding the need for a detailed property-by-property comparison.

Once you've implemented the `Equal` interface, you can utilize the `Equal.equals` function to check for equality using your custom logic.

**Example** (Comparing `Person` Instances)

```ts twoslash collapse={3-27} import.meta.vitest name="implementing-the-equal-interface-2"
import { Equal, Hash } from "effect"

class Person implements Equal.Equal {
  constructor(
    readonly id: number, // Unique identifier for each person
    readonly name: string,
    readonly age: number,
    readonly updatedAt: Date,
  ) {}

  // Defines equality based on id, name, and age
  [Equal.symbol](that: Equal.Equal): boolean {
    if (that instanceof Person) {
      return (
        Equal.equals(this.id, that.id) &&
        Equal.equals(this.name, that.name) &&
        Equal.equals(this.age, that.age)
      )
    }
    return false
  }

  // Generates a hash code based primarily on the unique id
  [Hash.symbol](): number {
    return Hash.hash(this.id)
  }
}

const alice = new Person(1, "Alice", 30, new Date("2024-01-01"))
console.log(
  Equal.equals(alice, new Person(1, "Alice", 30, new Date("2024-06-01"))),
)
Equal.equals(alice, new Person(1, "Alice", 30, new Date("2024-06-01"))) // => true

const bob = new Person(2, "Bob", 40, new Date("2024-01-01"))
console.log(Equal.equals(alice, bob))
Equal.equals(alice, bob) // => false
```

In this code, the equality check returns `true` when comparing `alice` to another `Person` record with the same `id`, `name`, and `age` but a different `updatedAt`, because `updatedAt` doesn't participate in the comparison. It returns `false` when comparing `alice` to `bob` because their identifying fields differ.

### Opting Into Reference Equality

Sometimes you want `Equal.equals` to compare a specific object or array by reference instead of by value, for example when identity matters more than content. The `Equal.byReference` function returns a proxy that opts a value out of structural comparison, without mutating the original:

**Example** (Opting a Value Out of Structural Comparison)

```ts twoslash import.meta.vitest name="opting-into-reference-equality-1"
import { Equal } from "effect"

const alice = { id: 1, name: "Alice", age: 30 }
const aliceCopy = { id: 1, name: "Alice", age: 30 }

console.log(Equal.equals(alice, aliceCopy))
Equal.equals(alice, aliceCopy) // => true

const aliceByReference = Equal.byReference(alice)

console.log(Equal.equals(aliceByReference, aliceCopy))
Equal.equals(aliceByReference, aliceCopy) // => false
```

`Equal.byReferenceUnsafe` does the same thing without allocating a proxy, by marking the original object directly. The marking is irreversible for the lifetime of that object.

The [Data](/docs/v4/data-types/data/) module still provides `Data.Class`, `Data.TaggedClass`, `Data.TaggedError`, and `Data.taggedEnum` for building tagged data types and errors. See the [Data module documentation](/docs/v4/data-types/data/) for details.

## Working with Collections

JavaScript's built-in `Set` and `Map` can be a bit tricky when it comes to checking equality:

**Example** (Native `Set` with Reference-Based Equality)

```ts twoslash import.meta.vitest name="working-with-collections-1"
const set = new Set()

// Adding two objects with the same content to the set
set.add({ name: "Alice", age: 30 })
set.add({ name: "Alice", age: 30 })

// Even though the objects have identical values, they are treated
// as different elements because JavaScript compares objects by reference,
// not by value.
console.log(set.size)
set.size // => 2
```

Even though the two elements in the set have the same values, the set contains two elements. Why? JavaScript's `Set` checks for equality by reference, not by values. This is unaffected by Effect's `Equal` module, since the native `Set` never consults it.

To perform value-based equality checks, you'll need to use the `Hash*` collection types available in the `effect` package. These collection types, such as [HashSet](/docs/v4/api/effect/HashSet) and [HashMap](/docs/v4/api/effect/HashMap), use `Equal.equals` for comparisons. This means plain objects, arrays, and other structurally-comparable values are deduplicated automatically, without needing any extra setup.

### HashSet

When you use the `HashSet`, it correctly handles value-based equality checks. In the following example, even though you're adding two objects with the same values, the `HashSet` treats them as a single element.

**Example** (Using `HashSet` for Value-Based Equality)

```ts twoslash import.meta.vitest name="hashset-1"
import { HashSet } from "effect"

// Creating a HashSet with plain objects
const set = HashSet.empty().pipe(
  HashSet.add({ name: "Alice", age: 30 }),
  HashSet.add({ name: "Alice", age: 30 }),
)

// HashSet recognizes them as equal, so only one element is stored
console.log(HashSet.size(set))
HashSet.size(set) // => 1
```

**Note**: Structural comparison covers every enumerable property, though. If two values are meant to represent the same entity but carry extra fields that legitimately differ (timestamps, request IDs, and similar metadata), `Equal.equals` treats them as unequal, and `HashSet` won't dedupe them:

**Example** (Structural Equality Considers Every Field)

```ts twoslash import.meta.vitest name="hashset-2"
import { HashSet } from "effect"

// Two records for "the same" data, but with differing request IDs
const set = HashSet.empty().pipe(
  HashSet.add({ name: "Alice", age: 30, requestId: "a1b2" }),
  HashSet.add({ name: "Alice", age: 30, requestId: "c3d4" }),
)

// requestId differs, so the objects are not structurally equal
console.log(HashSet.size(set))
HashSet.size(set) // => 2
```

In this case, `HashSet` keeps both entries because `requestId` is part of the structural comparison. If you want deduplication based on only some fields, implement the `Equal` interface as shown [above](#implementing-the-equal-interface) so equality ignores the fields that don't matter.

### HashMap

When working with the `HashMap`, you have the advantage of comparing keys by their values instead of their references. This is particularly helpful in scenarios where you want to associate values with keys based on their content.

**Example** (Value-Based Key Comparisons with `HashMap`)

```ts twoslash import.meta.vitest name="hashmap-1"
import { HashMap, Option } from "effect"

// Adding two objects with identical values as keys
const map = HashMap.empty().pipe(
  HashMap.set({ name: "Alice", age: 30 }, 1),
  HashMap.set({ name: "Alice", age: 30 }, 2),
)

console.log(HashMap.size(map))
HashMap.size(map) // => 1

// Retrieve the value associated with a key
console.log(HashMap.get(map, { name: "Alice", age: 30 }))
HashMap.get(map, { name: "Alice", age: 30 }) // => Option.some(2)
```

In this code snippet, `HashMap` is used to create a map where the keys are plain objects with identical values. A regular JavaScript `Map` would treat them as separate entries, because its default comparison is reference-based.

`HashMap`, however, uses `Equal.equals` for comparisons, so plain objects with identical content are treated as the same key without any extra setup. Thus, when we add both objects, the second key-value pair overrides the first, resulting in a single entry in the map.
