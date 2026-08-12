---
title: Creating Sinks
description: Discover how to create and use various sinks for processing streams, including counting, summing, collecting, folding, and handling success or failure.
sidebar:
  order: 1
---

In stream processing, sinks are used to consume and handle elements from a stream. Here, we'll explore various sink constructors that allow you to create sinks for specific tasks.

## Common Constructors

### head

The `Sink.head` sink retrieves only the first element from a stream, wrapping it in `Some`. If the stream has no elements, it returns `None`.

**Example** (Retrieving the First Element)

```ts twoslash import.meta.vitest name="retrieving-the-first-element-1"
import { Stream, Sink, Effect, Option } from "effect"

const nonEmptyStream = Stream.make(1, 2, 3, 4)

await Effect.runPromise(Stream.run(nonEmptyStream, Sink.head())) // => Option.some(1)

const emptyStream = Stream.empty

await Effect.runPromise(Stream.run(emptyStream, Sink.head())) // => Option.none()
```

### last

The `Sink.last` sink retrieves only the last element from a stream, wrapping it in `Some`. If the stream has no elements, it returns `None`.

**Example** (Retrieving the Last Element)

```ts twoslash import.meta.vitest name="retrieving-the-last-element-1"
import { Stream, Sink, Effect, Option } from "effect"

const nonEmptyStream = Stream.make(1, 2, 3, 4)

await Effect.runPromise(Stream.run(nonEmptyStream, Sink.last())) // => Option.some(4)

const emptyStream = Stream.empty

await Effect.runPromise(Stream.run(emptyStream, Sink.last())) // => Option.none()
```

### count

The `Sink.count` sink consumes all elements of the stream and counts the number of elements fed to it.

```ts twoslash import.meta.vitest name="count-1"
import { Stream, Sink, Effect } from "effect"

const stream = Stream.make(1, 2, 3, 4)

await Effect.runPromise(Stream.run(stream, Sink.count)) // => 4
```

### sum

The `Sink.sum` sink consumes all elements of the stream and sums incoming numeric values.

```ts twoslash import.meta.vitest name="sum-1"
import { Stream, Sink, Effect } from "effect"

const stream = Stream.make(1, 2, 3, 4)

await Effect.runPromise(Stream.run(stream, Sink.sum)) // => 10
```

### take

The `Sink.take` sink takes the specified number of values from the stream and returns them in an array.

```ts twoslash import.meta.vitest name="take-1"
import { Stream, Sink, Effect } from "effect"

const stream = Stream.make(1, 2, 3, 4)

await Effect.runPromise(Stream.run(stream, Sink.take(3))) // => [1, 2, 3]
```

### drain

The `Sink.drain` sink ignores its inputs, effectively discarding them.

```ts twoslash import.meta.vitest name="drain-1"
import { Stream, Console, Sink, Effect } from "effect"

const stream = Stream.make(1, 2, 3, 4).pipe(Stream.tap(Console.log))

await Effect.runPromise(Stream.run(stream, Sink.drain)) // => undefined
```

### timed

The `Sink.timed` sink executes the stream and measures its execution time, providing the [Duration](/docs/v4/data-types/duration/).

```ts twoslash import.meta.vitest name="timed-1"
import { Stream, Schedule, Sink, Effect } from "effect"

const stream = Stream.make(1, 2, 3, 4).pipe(
  Stream.schedule(Schedule.spaced("100 millis")),
)

Effect.runPromise(Stream.run(stream, Sink.timed)).then(console.log)
/*
Output:
{ _id: 'Duration', _tag: 'Millis', millis: 408 }
*/
```

### forEach

The `Sink.forEach` sink executes the provided effectful function for every element fed to it.

```ts twoslash import.meta.vitest name="foreach-1"
import { Stream, Console, Sink, Effect } from "effect"

const stream = Stream.make(1, 2, 3, 4)

await Effect.runPromise(Stream.run(stream, Sink.forEach(Console.log))) // => undefined
```

## Creating Sinks from Success and Failure

Just as you can define streams to hold or manipulate data, you can also create sinks with specific success or failure outcomes using the `Sink.fail` and `Sink.succeed` functions.

### Succeeding Sink

This example creates a sink that doesn’t consume any elements from its upstream source but instead immediately succeeds with a specified numeric value:

**Example** (Sink that Always Succeeds with a Value)

```ts twoslash import.meta.vitest name="succeeding-sink-1"
import { Stream, Sink, Effect } from "effect"

const stream = Stream.make(1, 2, 3, 4)

await Effect.runPromise(Stream.run(stream, Sink.succeed(0))) // => 0
```

### Failing Sink

In this example, the sink also doesn’t consume any elements from its upstream source. Instead, it fails with a specified error message of type `string`:

**Example** (Sink that Always Fails with an Error Message)

```ts twoslash import.meta.vitest name="failing-sink-1"
import { Stream, Sink, Effect, Exit } from "effect"

const stream = Stream.make(1, 2, 3, 4)

await Effect.runPromiseExit(Stream.run(stream, Sink.fail("fail!"))) // => Exit.fail("fail!")
```

## Collecting

### Collecting All Elements

To gather all elements from a data stream into an array, use the `Sink.collect` sink.

The final output contains all elements from the stream in the order they were emitted.

**Example** (Collecting All Stream Elements)

```ts twoslash import.meta.vitest name="collecting-all-stream-elements-1"
import { Stream, Sink, Effect } from "effect"

const stream = Stream.make(1, 2, 3, 4)

await Effect.runPromise(Stream.run(stream, Sink.collect())) // => [1, 2, 3, 4]
```

### Collecting a Specified Number

To collect a fixed number of elements from a stream into an array, use `Sink.take`. This sink stops collecting once it reaches the specified limit.

**Example** (Collecting a Limited Number of Elements)

```ts twoslash import.meta.vitest name="collecting-a-limited-number-of-elements-1"
import { Stream, Sink, Effect } from "effect"

const stream = Stream.make(1, 2, 3, 4, 5)

await Effect.runPromise(
  Stream.run(
    stream,
    // Collect the first 3 elements into an array
    Sink.take(3),
  ),
) // => [1, 2, 3]
```

### Collecting While Meeting a Condition

To gather elements from a stream while they satisfy a specific condition, use `Sink.takeWhile`. This sink collects elements until the provided predicate returns `false`.

**Example** (Collecting Elements Until a Condition Fails)

```ts twoslash import.meta.vitest name="collecting-elements-until-a-condition-fails-1"
import { Stream, Sink, Effect } from "effect"

const stream = Stream.make(1, 2, 0, 4, 0, 6, 7)

await Effect.runPromise(
  Stream.run(
    stream,
    // Collect elements while they are not equal to 0
    Sink.takeWhile((n) => n !== 0),
  ),
) // => [1, 2]
```

### Collecting into a HashSet

To accumulate stream elements into a native `Set`, fold them with `Sink.reduce`. This ensures that each element appears only once in the final set.

**Example** (Collecting Unique Elements into a HashSet)

```ts twoslash import.meta.vitest name="collecting-unique-elements-into-a-hashset-1"
import { Stream, Sink, Effect } from "effect"

const stream = Stream.make(1, 2, 2, 3, 4, 4)

await Effect.runPromise(
  Stream.run(
    stream,
    Sink.reduce(
      () => new Set<number>(),
      (s, n) => s.add(n),
    ),
  ),
) // => new Set([1, 2, 3, 4])
```

### Collecting into HashSets of a Specific Size

For controlled collection into a `Set` with a specified maximum size, fold with `Sink.reduceWhile`, stopping once the set reaches the given limit.

**Example** (Collecting Unique Elements with a Set Size Limit)

```ts twoslash import.meta.vitest name="collecting-unique-elements-with-a-set-size-limit-1"
import { Stream, Sink, Effect } from "effect"

const stream = Stream.make(1, 2, 2, 3, 4, 4)

await Effect.runPromise(
  Stream.run(
    stream,
    // Collect unique elements, limiting the set size to 3
    Sink.reduceWhile(
      () => new Set<number>(),
      (s) => s.size < 3,
      (s, n) => s.add(n),
    ),
  ),
) // => new Set([1, 2, 3])
```

### Collecting into a HashMap

For more complex collection scenarios, fold elements into a native `Map<K, A>` with `Sink.reduce`, using a key function to define each element's grouping and a merge function to combine values sharing the same key.

**Example** (Grouping and Merging Stream Elements in a HashMap)

In this example, we use `(n) => n % 3` to determine map keys and `(a, b) => a + b` to merge elements with the same key:

```ts twoslash import.meta.vitest name="grouping-and-merging-stream-elements-in-a-hashmap-1"
import { Stream, Sink, Effect } from "effect"

const stream = Stream.make(1, 3, 2, 3, 1, 5, 1)

await Effect.runPromise(
  Stream.run(
    stream,
    Sink.reduce(
      () => new Map<number, number>(),
      (m, n) => {
        const key = n % 3 // Key function to group by element value
        return m.set(key, m.has(key) ? m.get(key)! + n : n) // Merge function to sum values with the same key
      },
    ),
  ),
) // => new Map([[1, 3], [0, 6], [2, 7]])
```

### Collecting into a HashMap with Limited Keys

To accumulate elements into a native `Map` with a maximum number of keys, fold with `Sink.reduceWhile`, stopping once the map reaches the specified key limit. This requires a key function to define the grouping of each element and a merge function to combine values with the same key.

**Example** (Limiting Collected Keys in a HashMap)

```ts twoslash import.meta.vitest name="limiting-collected-keys-in-a-hashmap-1"
import { Stream, Sink, Effect } from "effect"

const stream = Stream.make(1, 3, 2, 3, 1, 5, 1)

await Effect.runPromise(
  Stream.run(
    stream,
    Sink.reduceWhile(
      () => new Map<number, number>(),
      (m) => m.size < 3, // Stop once the map has 3 keys
      (m, n) => {
        const key = n // Key function to group by element value
        return m.set(key, m.has(key) ? m.get(key)! + n : n) // Merge function to sum values with the same key
      },
    ),
  ),
) // => new Map([[1, 1], [3, 3], [2, 2]])
```

## Folding

### Reducing Elements

If you want to reduce a stream into a single cumulative value by applying an operation to each element in sequence, you can use the `Sink.reduce` function.

**Example** (Summing Elements in a Stream with `Sink.reduce`)

```ts twoslash import.meta.vitest name="summing-elements-in-a-stream-using-reduce-1"
import { Stream, Sink, Effect } from "effect"

const stream = Stream.make(1, 2, 3, 4)

await Effect.runPromise(
  Stream.run(
    stream,
    // Use reduce to sequentially add each element, starting with 0
    Sink.reduce(
      () => 0,
      (a, b) => a + b,
    ),
  ),
) // => 10
```

### Folding with Termination

Sometimes, you may want to fold elements in a stream but stop the process once a specific condition is met. This is known as "short-circuiting." You can accomplish this with the `Sink.fold` function, which lets you define a termination condition.

**Example** (Folding with a Condition to Stop Early)

```ts twoslash import.meta.vitest name="folding-with-a-condition-to-stop-early-1"
import { Stream, Sink, Effect } from "effect"

const stream = Stream.iterate(0, (n) => n + 1)

await Effect.runPromise(
  Stream.run(
    stream,
    Sink.fold(
      () => 0, // Initial value
      (sum) => sum <= 10, // Termination condition
      (a, b) => Effect.succeed(a + b), // Folding operation
    ),
  ),
) // => 15
```

### Folding Until a Limit

To accumulate elements until a specific count is reached, use `Sink.foldUntil`. This sink folds elements up to the specified limit and then stops.

**Example** (Accumulating a Set Number of Elements)

```ts twoslash import.meta.vitest name="accumulating-a-set-number-of-elements-1"
import { Stream, Sink, Effect } from "effect"

const stream = Stream.make(1, 2, 3, 4, 5, 6, 7, 8, 9, 10)

await Effect.runPromise(
  Stream.run(
    stream,
    // Fold elements, stopping after accumulating 3 values
    Sink.foldUntil(
      () => 0,
      3,
      (a, b) => Effect.succeed(a + b),
    ),
  ),
) // => 6
```

### Folding with Weighted Elements

In some scenarios, you may want to fold elements based on a defined "weight" or "cost," accumulating elements until a specified maximum cost is reached. You can accomplish this by building a custom sink out of `Sink.fold`, whose termination condition checks the accumulated cost instead of a plain element count.

**Example** (Accumulating Elements Based on Weight)

In the example below, each element has a weight of `1`, and the folding resets when the accumulated weight hits `3`.

```ts twoslash import.meta.vitest name="folding-with-weighted-elements-1"
import { Stream, Sink, Effect } from "effect"

const foldWeighted = <A>(cost: (a: A) => number, maxCost: number) =>
  Sink.fold<{ readonly elements: Array<A>; readonly cost: number }, A>(
    () => ({ elements: [], cost: 0 }),
    (state) => state.cost < maxCost, // Keep accumulating while under the max cost
    (state, a) =>
      Effect.succeed({
        elements: [...state.elements, a],
        cost: state.cost + cost(a),
      }),
  ).pipe(Sink.map((state) => state.elements))

const stream = Stream.make(3, 2, 4, 1, 5, 6, 2, 1, 3, 5, 6).pipe(
  Stream.transduce(
    foldWeighted(
      () => 1, // Each element has a weight of 1
      3, // Maximum accumulated cost
    ),
  ),
)

await Effect.runPromise(Stream.runCollect(stream)) // => [[3, 2, 4], [1, 5, 6], [2, 1, 3], [5, 6]]
```
