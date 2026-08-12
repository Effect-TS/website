---
title: HashSet
description: Learn about HashSet data structures - both immutable and mutable variants.
sidebar:
  order: 9
---

import { Aside } from "@astrojs/starlight/components"

A HashSet represents an **unordered** collection of **unique** values with efficient lookup, insertion and removal operations.

The Effect library provides two versions of this structure:

- [HashSet](/docs/v4/data-types/hash-set/#hashset) - Immutable
- [MutableHashSet](/docs/v4/data-types/hash-set/#mutablehashset) - Mutable

Both versions provide constant-time operations on average. The main difference is how they handle changes: one returns new sets, the other modifies the original.

### Why use HashSet?

HashSet solves the problem of maintaining an **unsorted collection where each value appears exactly once**, with fast operations for checking membership and adding/removing values.

Some common use cases include:

- Tracking unique items (e.g., users who have completed an action)
- Efficiently testing for membership in a collection
- Performing set operations like union, intersection, and difference
- Eliminating duplicates from a collection

### When to use HashSet Instead of other collections

Choose HashSet (either variant) over other collections when:

- You need to ensure elements are unique
- You frequently need to check if an element exists in the collection
- You need to perform set operations like union, intersection, and difference
- The order of elements doesn't matter to your use case

Choose other collections when:

- You need to maintain insertion order (use `List` or `Array`)
- You need key-value associations (use `HashMap` or `MutableHashMap`)
- You need to frequently access elements by index (use `Array`)

### Choosing between immutable and mutable variants

Effect offers both immutable and mutable versions to support different coding styles and performance needs.

**HashSet**

This version never modifies the original set. Instead, it returns a new set for every change.

Characteristics:

- Operations return new instances instead of modifying the original
- Previous states are preserved
- Thread-safe by design
- Ideal for functional programming patterns
- Suitable for sharing across different parts of your application

**MutableHashSet**

This version allows direct updates: adding and removing values changes the set in place.

Characteristics:

- Operations modify the original set directly
- More efficient when building sets incrementally
- Requires careful handling to avoid unexpected side effects
- Better performance in scenarios with many modifications
- Ideal for localized use where mutations won't cause issues elsewhere

### When to use each variant

Use **HashSet** when:

- You need predictable behavior with no side effects
- You want to preserve previous states of your data
- You're sharing sets across different parts of your application
- You prefer functional programming patterns
- You need fiber safety in concurrent environments

Use **MutableHashSet** when:

- Performance is critical, and you need to avoid creating new instances
- You're building a collection incrementally with many additions/removals
- You're working in a controlled scope where mutation is safe
- You need to optimize memory usage in performance-critical code

### Hybrid approach

You can apply multiple updates to a `HashSet` by chaining immutable operations with `pipe`. This allows you to perform several changes at once without mutating the original set.

**Example** (Batching changes without mutating the original)

```ts twoslash import.meta.vitest name="hybrid-approach-1"
import { HashSet } from "effect"

// Create an immutable HashSet
const original = HashSet.make(1, 2, 3)

// Apply several updates by chaining immutable operations
const modified = original.pipe(
  HashSet.add(4),
  HashSet.add(5),
  HashSet.remove(1),
)

console.log(Array.from(original))
Array.from(original) // => [1, 2, 3]

console.log(Array.from(modified))
Array.from(modified) // => [2, 3, 4, 5]
```

## Performance characteristics

Both `HashSet` and `MutableHashSet` offer similar average-time performance for core operations:

| Operation      | HashSet      | MutableHashSet | Description                     |
| -------------- | ------------ | -------------- | ------------------------------- |
| Lookup         | O(1) average | O(1) average   | Check if a value exists         |
| Insertion      | O(1) average | O(1) average   | Add a value                     |
| Removal        | O(1) average | O(1) average   | Remove a value                  |
| Iteration      | O(n)         | O(n)           | Iterate over all values         |
| Set operations | O(n)         | O(n)           | Union, intersection, difference |

The main difference is how updates are handled:

- **HashSet** returns a new set for each change. This can be slower if many changes are made in a row.
- **MutableHashSet** updates the same set in place. This is usually faster when performing many changes.

## Equality and uniqueness

Both `HashSet` and `MutableHashSet` use Effect's [`Equal`](/docs/v4/trait/equal/) trait to determine if two elements are the same. This ensures that each value appears only once in the set.

- **Primitive values** (like numbers or strings) are compared by value, similar to the `===` operator.
- **Objects and custom types** must implement the `Equal` interface to define what it means for two instances to be equal. If no implementation is provided, equality falls back to reference comparison.

**Example** (Using custom equality and hashing)

```ts twoslash import.meta.vitest name="equality-and-uniqueness-1"
import { Equal, Hash, HashSet } from "effect"

// Define a custom class that implements the Equal interface
class Person implements Equal.Equal {
  constructor(
    readonly id: number,
    readonly name: string,
    readonly age: number,
  ) {}

  // Two Person instances are equal if their id, name, and age match
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

  // Hash code is based on the id (must match the equality logic)
  [Hash.symbol](): number {
    return Hash.hash(this.id)
  }
}

// Add two different instances with the same content
const set = HashSet.empty().pipe(
  HashSet.add(new Person(1, "Alice", 30)),
  HashSet.add(new Person(1, "Alice", 30)),
)

// Only one instance is kept
console.log(HashSet.size(set))
HashSet.size(set) // => 1
```

### Simplifying Equality with Plain Objects and Schema

Plain objects implement [`Equal`](/docs/v4/trait/equal/) automatically, based on structural equality. No wrapper is needed. Values decoded with `Schema` already benefit from this, as shown below.

**Example** (Structural Equality of Plain Objects)

```ts twoslash import.meta.vitest name="structural-equality-of-plain-objects-1"
import { Equal, HashSet, pipe } from "effect"

// Define two records with the same content
const person1 = { id: 1, name: "Alice", age: 30 }
const person2 = { id: 1, name: "Alice", age: 30 }

// They are different object references
console.log(Object.is(person1, person2))
Object.is(person1, person2) // => false

// But they are equal in value (based on content)
console.log(Equal.equals(person1, person2))
Equal.equals(person1, person2) // => true

// Add both to a HashSet; only one will be stored
const set = pipe(HashSet.empty(), HashSet.add(person1), HashSet.add(person2))

console.log(HashSet.size(set))
HashSet.size(set) // => 1
```

**Example** (Decoding with `Schema.Struct`)

```ts twoslash import.meta.vitest name="decoding-with-schema-struct-1"
import { Equal, MutableHashSet, Schema } from "effect"

// Define a schema that describes the structure of a Person
// (no Data wrapper needed - decoded objects have structural
// equality automatically)
const PersonSchema = Schema.Struct({
  id: Schema.Finite,
  name: Schema.String,
  age: Schema.Finite,
})

// Decode values from plain objects
const Person = Schema.decodeSync(PersonSchema)

const person1 = Person({ id: 1, name: "Alice", age: 30 })
const person2 = Person({ id: 1, name: "Alice", age: 30 })

// person1 and person2 are different instances but equal in value
console.log(Equal.equals(person1, person2))
Equal.equals(person1, person2) // => true

// Add both to a MutableHashSet; only one will be stored
const set = MutableHashSet.empty().pipe(
  MutableHashSet.add(person1),
  MutableHashSet.add(person2),
)

console.log(MutableHashSet.size(set))
MutableHashSet.size(set) // => 1
```

## HashSet

A `HashSet<A>` is an **immutable**, **unordered** collection of **unique** values.
It guarantees that each value appears only once and supports fast operations like lookup, insertion, and removal.

Any operation that would modify the set (like adding or removing a value) returns a new `HashSet`, leaving the original unchanged.

### Operations

| Category     | Operation                                                | Description                                 | Time Complexity |
| ------------ | -------------------------------------------------------- | ------------------------------------------- | --------------- |
| constructors | [empty](/docs/v4/api/effect/HashSet#empty)               | Creates an empty HashSet                    | O(1)            |
| constructors | [fromIterable](/docs/v4/api/effect/HashSet#fromIterable) | Creates a HashSet from an iterable          | O(n)            |
| constructors | [make](/docs/v4/api/effect/HashSet#make)                 | Creates a HashSet from multiple values      | O(n)            |
| elements     | [has](/docs/v4/api/effect/HashSet#has)                   | Checks if a value exists in the set         | O(1) avg        |
| elements     | [some](/docs/v4/api/effect/HashSet#some)                 | Checks if any element satisfies a predicate | O(n)            |
| elements     | [every](/docs/v4/api/effect/HashSet#every)               | Checks if all elements satisfy a predicate  | O(n)            |
| elements     | [isSubset](/docs/v4/api/effect/HashSet#isSubset)         | Checks if a set is a subset of another      | O(n)            |
| getters      | [size](/docs/v4/api/effect/HashSet#size)                 | Gets the number of elements                 | O(1)            |
| mutations    | [add](/docs/v4/api/effect/HashSet#add)                   | Adds a value to the set                     | O(1) avg        |
| mutations    | [remove](/docs/v4/api/effect/HashSet#remove)             | Removes a value from the set                | O(1) avg        |
| operations   | [difference](/docs/v4/api/effect/HashSet#difference)     | Computes set difference (A - B)             | O(n)            |
| operations   | [intersection](/docs/v4/api/effect/HashSet#intersection) | Computes set intersection (A ∩ B)           | O(n)            |
| operations   | [union](/docs/v4/api/effect/HashSet#union)               | Computes set union (A ∪ B)                  | O(n)            |
| mapping      | [map](/docs/v4/api/effect/HashSet#map)                   | Transforms each element                     | O(n)            |
| folding      | [reduce](/docs/v4/api/effect/HashSet#reduce)             | Reduces the set to a single value           | O(n)            |
| filtering    | [filter](/docs/v4/api/effect/HashSet#filter)             | Keeps elements that satisfy a predicate     | O(n)            |

`HashSet` is directly `Iterable`, so use `Array.from(self)` or `self[Symbol.iterator]()` to access its values. For transformations and traversals, compose the operations from the `Iterable` module; to split a set, use two `HashSet.filter` calls.

**Example** (Basic creation and operations)

```ts twoslash import.meta.vitest name="operations-1"
import { HashSet } from "effect"

// Create an initial set with 3 values
const set1 = HashSet.make(1, 2, 3)

// Add a value (returns a new set)
const set2 = HashSet.add(set1, 4)

// The original set is unchanged
console.log(Array.from(set1))
Array.from(set1) // => [1, 2, 3]

console.log(Array.from(set2))
Array.from(set2) // => [1, 2, 3, 4]

// Perform set operations with another set
const set3 = HashSet.make(3, 4, 5)

// Combine both sets
const union = HashSet.union(set2, set3)

console.log(Array.from(union))
Array.from(union) // => [1, 2, 3, 4, 5]

// Shared values
const intersection = HashSet.intersection(set2, set3)

console.log(Array.from(intersection))
Array.from(intersection) // => [3, 4]

// Values only in set2
const difference = HashSet.difference(set2, set3)

console.log(Array.from(difference))
Array.from(difference) // => [1, 2]
```

**Example** (Chaining with `pipe`)

```ts twoslash import.meta.vitest name="operations-2"
import { HashSet, pipe } from "effect"

const result = pipe(
  // Duplicates are ignored
  HashSet.make(1, 2, 2, 3, 4, 5, 5),
  // Keep even numbers
  HashSet.filter((n) => n % 2 === 0),
  // Double each value
  HashSet.map((n) => n * 2),
  // Convert to array
  Array.from,
)

console.log(result)
result // => [4, 8]
```

## MutableHashSet

A `MutableHashSet<A>` is a **mutable**, **unordered** collection of **unique** values.
Unlike `HashSet`, it allows direct modifications, operations like `add`, `remove`, and `clear` update the original set instead of returning a new one.

This mutability can improve performance when you need to build or update a set repeatedly, especially within a local or isolated scope.

### Operations

| Category     | Operation                                                       | Description                         | Complexity |
| ------------ | --------------------------------------------------------------- | ----------------------------------- | ---------- |
| constructors | [empty](/docs/v4/api/effect/MutableHashSet#empty)               | Creates an empty MutableHashSet     | O(1)       |
| constructors | [fromIterable](/docs/v4/api/effect/MutableHashSet#fromIterable) | Creates a set from an iterable      | O(n)       |
| constructors | [make](/docs/v4/api/effect/MutableHashSet#make)                 | Creates a set from multiple values  | O(n)       |
| elements     | [has](/docs/v4/api/effect/MutableHashSet#has)                   | Checks if a value exists in the set | O(1) avg   |
| elements     | [add](/docs/v4/api/effect/MutableHashSet#add)                   | Adds a value to the set             | O(1) avg   |
| elements     | [remove](/docs/v4/api/effect/MutableHashSet#remove)             | Removes a value from the set        | O(1) avg   |
| getters      | [size](/docs/v4/api/effect/MutableHashSet#size)                 | Gets the number of elements         | O(1)       |
| mutations    | [clear](/docs/v4/api/effect/MutableHashSet#clear)               | Removes all values from the set     | O(1)       |

**Example** (Working with a mutable set)

```ts twoslash import.meta.vitest name="operations-3"
import { MutableHashSet } from "effect"

// Create a mutable set with initial values
const set = MutableHashSet.make(1, 2, 3)

// Add a new element (updates the set in place)
MutableHashSet.add(set, 4)

// Check current contents
console.log([...set])
Array.from(set) // => [1, 2, 3, 4]

// Remove an element (modifies in place)
MutableHashSet.remove(set, 1)

console.log([...set])
Array.from(set) // => [2, 3, 4]

// Clear the set entirely
MutableHashSet.clear(set)

console.log(MutableHashSet.size(set))
MutableHashSet.size(set) // => 0
```

## Interoperability with JavaScript

Both `HashSet` and `MutableHashSet` implement the `Iterable` interface, so you can use them with JavaScript features like:

- the spread operator (`...`)
- `for...of` loops
- `Array.from`

You can also extract values as an array using `Array.from`.

**Example** (Using HashSet values in JS-native ways)

```ts twoslash import.meta.vitest name="interoperability-with-javascript-1"
import { HashSet, MutableHashSet } from "effect"

// Immutable HashSet
const hashSet = HashSet.make(1, 2, 3)

// Mutable variant
const mutableSet = MutableHashSet.make(4, 5, 6)

// HashSet is directly Iterable - no conversion needed
//
//      ┌─── Iterable<number>
//      ▼
const iterable: Iterable<number> = hashSet

// Spread into console.log
console.log(...iterable)
// Output: 1 2 3
Array.from(iterable) // => [1, 2, 3]

// Use in a for...of loop
for (const value of mutableSet) {
  console.log(value)
}
// Output: 4 5 6

// Convert to array with Array.from
console.log(Array.from(mutableSet))
Array.from(mutableSet) // => [4, 5, 6]

// Convert immutable HashSet to array using Array.from
//
//      ┌─── Array<number>
//      ▼
const array = Array.from(hashSet) // => [1, 2, 3]

console.log(array)
```

<Aside type="caution" title="Performance considerations">
  Avoid repeatedly converting between `HashSet` and JavaScript arrays in hot
  paths or large collections. These operations involve copying data and can
  impact memory and speed.
</Aside>
