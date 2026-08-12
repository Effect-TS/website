---
title: Operations
description: Explore essential operations for manipulating and managing data in streams, including tapping, mapping, filtering, merging, and more, to effectively process and transform streaming data.
sidebar:
  order: 4
---

import { Aside } from "@astrojs/starlight/components"

In this guide, we'll explore some essential operations you can perform on streams. These operations allow you to manipulate and interact with stream elements in various ways.

## Tapping

The `Stream.tap` operation allows you to run an effect on each element emitted by the stream, observing or performing side effects without altering the elements or return type. This can be useful for logging, monitoring, or triggering additional actions with each emission.

**Example** (Logging with `Stream.tap`)

For example, `Stream.tap` can be used to log each element before and after a mapping operation:

```ts twoslash import.meta.vitest name="tapping-1"
import { Stream, Console, Effect } from "effect"

const stream = Stream.make(1, 2, 3).pipe(
  Stream.tap((n) => Console.log(`before mapping: ${n}`)),
  Stream.map((n) => n * 2),
  Stream.tap((n) => Console.log(`after mapping: ${n}`)),
)

await Effect.runPromise(Stream.runCollect(stream)) // => [2, 4, 6]
```

## Taking Elements

The "taking" operations in streams let you extract a specific set of elements, either by a fixed number, condition, or position within the stream. Here are a few ways to apply these operations:

| API         | Description                                           |
| ----------- | ----------------------------------------------------- |
| `take`      | Extracts a fixed number of elements.                  |
| `takeWhile` | Extracts elements while a certain condition is met.   |
| `takeUntil` | Extracts elements until a certain condition is met.   |
| `takeRight` | Extracts a specified number of elements from the end. |

**Example** (Extracting Elements in Different Ways)

```ts twoslash import.meta.vitest name="taking-elements-1"
import { Stream, Effect } from "effect"

const stream = Stream.iterate(0, (n) => n + 1)

// Using `take` to extract a fixed number of elements:
const s1 = Stream.take(stream, 5)
await Effect.runPromise(Stream.runCollect(s1)) // => [0, 1, 2, 3, 4]

// Using `takeWhile` to extract elements while a condition is met:
const s2 = Stream.takeWhile(stream, (n) => n < 5)
await Effect.runPromise(Stream.runCollect(s2)) // => [0, 1, 2, 3, 4]

// Using `takeUntil` to extract elements until a condition is met:
const s3 = Stream.takeUntil(stream, (n) => n === 5)
await Effect.runPromise(Stream.runCollect(s3)) // => [0, 1, 2, 3, 4, 5]

// Using `takeRight` to take elements from the end of the stream:
const s4 = Stream.takeRight(s3, 3)
await Effect.runPromise(Stream.runCollect(s4)) // => [3, 4, 5]
```

## Streams as an Alternative to Async Iterables

When working with asynchronous data sources, such as async iterables, you often need to consume data in a loop until a certain condition is met. Streams provide a similar approach and offer additional flexibility.

With async iterables, data is processed in a loop until a break or return statement is encountered. To replicate this behavior with Streams, consider these options:

| API         | Description                                                                                                                                                                                                  |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `takeUntil` | Takes elements from a stream until a specified condition is met, similar to breaking out of a loop.                                                                                                          |
| `toPull`    | Returns an effect that continuously pulls arrays of elements from the stream. This effect fails with a `Cause.Done` completion signal when the stream is finished, or with the stream's own error otherwise. |

**Example** (Using `Stream.toPull`)

```ts twoslash
import { Stream, Effect } from "effect"

// Simulate a chunked stream
const stream = Stream.fromIterable([1, 2, 3, 4, 5]).pipe(Stream.rechunk(2))

const program = Effect.gen(function* () {
  // Create an effect to get data chunks from the stream
  const getChunk = yield* Stream.toPull(stream)

  // Continuously fetch and process chunks
  while (true) {
    const chunk = yield* getChunk
    console.log(chunk)
  }
})

Effect.runPromise(Effect.scoped(program)).then(console.log, console.error)
/*
Output:
[ 1, 2 ]
[ 3, 4 ]
[ 5 ]
{
  '~effect/Cause/Done': '~effect/Cause/Done',
  _tag: 'Done',
  value: undefined
}
*/
```

## Mapping

### Basic Mapping

The `Stream.map` operation applies a specified function to each element in a stream, creating a new stream with the transformed values.

**Example** (Incrementing Each Element by 1)

```ts twoslash import.meta.vitest name="basic-mapping-1"
import { Stream, Effect } from "effect"

const stream = Stream.make(1, 2, 3).pipe(
  Stream.map((n) => n + 1), // Increment each element by 1
)

await Effect.runPromise(Stream.runCollect(stream)) // => [2, 3, 4]
```

### Mapping to a Constant Value

The `Stream.map` method allows you to replace each success value in a stream with a specified constant value. This can be useful when you want all elements in the stream to emit a uniform value, regardless of the original data.

**Example** (Mapping to `null`)

```ts twoslash import.meta.vitest name="mapping-to-a-constant-value-1"
import { Stream, Effect } from "effect"

const stream = Stream.range(1, 5).pipe(Stream.map(() => null))

await Effect.runPromise(Stream.runCollect(stream)) // => [null, null, null, null, null]
```

### Effectful Mapping

For transformations involving effects, use `Stream.mapEffect`. This function applies an effectful operation to each element in the stream, producing a new stream with effectful results.

**Example** (Random Number Generation)

```ts twoslash import.meta.vitest name="effectful-mapping-1"
import { Stream, Random, Effect } from "effect"

const stream = Stream.make(10, 20, 30).pipe(
  // Generate a random number between 0 and each element
  Stream.mapEffect((n) => Random.nextIntBetween(0, n)),
)

const randomResults = await Effect.runPromise(Stream.runCollect(stream))
randomResults.length // => 3
```

To handle multiple effectful transformations concurrently, you can use the [concurrency](/docs/v4/concurrency/basic-concurrency/#concurrency-options) option. This option allows a specified number of effects to run concurrently, with results emitted downstream in their original order.

**Example** (Fetching URLs Concurrently)

```ts twoslash import.meta.vitest name="effectful-mapping-2"
import { Stream, Effect } from "effect"

const fetchUrl = (url: string) =>
  Effect.gen(function* () {
    console.log(`Fetching ${url}`)
    yield* Effect.sleep("100 millis")
    console.log(`Fetching ${url} done`)
    return [`Resource 0-${url}`, `Resource 1-${url}`, `Resource 2-${url}`]
  })

const stream = Stream.make("url1", "url2", "url3").pipe(
  // Fetch each URL concurrently with a limit of 2
  Stream.mapEffect(fetchUrl, { concurrency: 2 }),
)

await Effect.runPromise(Stream.runCollect(stream)) // => [["Resource 0-url1", "Resource 1-url1", "Resource 2-url1"], ["Resource 0-url2", "Resource 1-url2", "Resource 2-url2"], ["Resource 0-url3", "Resource 1-url3", "Resource 2-url3"]]
```

### Stateful Mapping

`Stream.mapAccum` is similar to `Stream.map`, but it applies a transformation with state tracking, allowing you to map and accumulate values within a single operation. This is useful for tasks like calculating a running total in a stream.

**Example** (Calculating a Running Total)

```ts twoslash import.meta.vitest name="stateful-mapping-1"
import { Stream, Effect } from "effect"

const stream = Stream.range(1, 5).pipe(
  //                                       ┌─── next state
  //                                       │          ┌─── emitted values
  //                                       ▼          ▼
  Stream.mapAccum(
    () => 0,
    (state, n) => [state + n, [state + n]],
  ),
)

await Effect.runPromise(Stream.runCollect(stream)) // => [1, 3, 6, 10, 15]
```

### Mapping and Flattening

The `Stream.flattenIterable` operation is similar to `Stream.map`, but it goes further by mapping each element to zero or more elements (as an `Iterable`) and then flattening the entire stream. This is particularly useful for transforming each element into multiple values.

**Example** (Splitting and Flattening a Stream)

```ts twoslash import.meta.vitest name="mapping-and-flattening-1"
import { Stream, Effect } from "effect"

const numbers = Stream.make("1-2-3", "4-5", "6").pipe(
  Stream.map((s) => s.split("-")),
  Stream.flattenIterable,
)

await Effect.runPromise(Stream.runCollect(numbers)) // => ["1", "2", "3", "4", "5", "6"]
```

## Filtering

The `Stream.filter` operation allows you to pass through only elements that meet a specific condition. It's a way to retain elements in a stream that satisfy a particular criteria while discarding the rest.

**Example** (Filtering Even Numbers)

```ts twoslash import.meta.vitest name="filtering-1"
import { Stream, Effect } from "effect"

const stream = Stream.range(1, 11).pipe(Stream.filter((n) => n % 2 === 0))

await Effect.runPromise(Stream.runCollect(stream)) // => [2, 4, 6, 8, 10]
```

## Scanning

Stream scanning allows you to apply a function cumulatively to each element in the stream, emitting every intermediate result. Unlike `reduce`, which only provides a final result, `scan` offers a step-by-step view of the accumulation process.

**Example** (Cumulative Addition)

```ts twoslash import.meta.vitest name="scanning-1"
import { Stream, Effect } from "effect"

const stream = Stream.range(1, 5).pipe(Stream.scan(0, (a, b) => a + b))

await Effect.runPromise(Stream.runCollect(stream)) // => [0, 1, 3, 6, 10, 15]
```

If you need only the final accumulated value, you can use [Stream.runFold](/docs/v4/stream/consuming-streams/#using-runfold):

**Example** (Final Accumulated Result)

```ts twoslash import.meta.vitest name="scanning-2"
import { Stream, Effect } from "effect"

const fold = Stream.range(1, 5).pipe(
  Stream.runFold(
    () => 0,
    (a, b) => a + b,
  ),
)

await Effect.runPromise(fold) // => 15
```

## Draining

Stream draining lets you execute effectful operations within a stream while discarding the resulting values. This can be useful when you need to run actions or perform side effects but don't require the emitted values. The `Stream.drain` function achieves this by ignoring all elements in the stream and producing an empty output stream.

**Example** (Executing Effectful Operations without Collecting Values)

```ts twoslash import.meta.vitest name="draining-1"
import { Stream, Effect, Random } from "effect"

const stream = Stream.fromEffectRepeat(
  Effect.gen(function* () {
    const nextInt = yield* Random.nextInt
    const number = Math.abs(nextInt % 10)
    console.log(`random number: ${number}`)
    return number
  }),
).pipe(Stream.take(3))

const withValues = await Effect.runPromise(Stream.runCollect(stream))
withValues.length // => 3

const drained = Stream.drain(stream)

await Effect.runPromise(Stream.runCollect(drained)) // => []
```

## Detecting Changes in a Stream

The `Stream.changes` operation detects and emits elements that differ from their preceding elements within a stream. This can be useful for tracking changes or deduplicating consecutive values.

**Example** (Emitting Distinct Consecutive Elements)

```ts twoslash import.meta.vitest name="detecting-changes-in-a-stream-1"
import { Stream, Effect } from "effect"

const stream = Stream.make(1, 1, 1, 2, 2, 3, 4).pipe(Stream.changes)

await Effect.runPromise(Stream.runCollect(stream)) // => [1, 2, 3, 4]
```

## Zipping

Zipping combines elements from two streams into a new stream, pairing elements from each input stream. This can be achieved with `Stream.zip` or `Stream.zipWith`, allowing for custom pairing logic.

**Example** (Basic Zipping)

In this example, elements from the two streams are paired sequentially. The resulting stream ends when one of the streams is exhausted.

```ts twoslash import.meta.vitest name="zipping-1"
import { Stream, Effect } from "effect"

// Zip two streams together
const stream = Stream.zip(
  Stream.make(1, 2, 3, 4, 5, 6),
  Stream.make("a", "b", "c"),
)

await Effect.runPromise(Stream.runCollect(stream)) // => [[1, "a"], [2, "b"], [3, "c"]]
```

**Example** (Custom Zipping Logic)

Here, `Stream.zipWith` applies custom logic to each pair, combining elements in a user-defined way.

```ts twoslash import.meta.vitest name="zipping-2"
import { Stream, Effect } from "effect"

// Zip two streams with custom pairing logic
const stream = Stream.zipWith(
  Stream.make(1, 2, 3, 4, 5, 6),
  Stream.make("a", "b", "c"),
  (n, s) => [n + 10, s + "!"],
)

await Effect.runPromise(Stream.runCollect(stream)) // => [[11, "a!"], [12, "b!"], [13, "c!"]]
```

### Zipping Streams at Different Rates

When combining streams that emit elements at different speeds, you may not want to wait for the slower stream to emit. Using `Stream.zipLatest` or `Stream.zipLatestWith`, you can zip elements as soon as either stream produces a new value. These functions use the most recent element from the slower stream whenever a new value arrives from the faster stream.

**Example** (Combining Streams with Different Emission Rates)

```ts twoslash import.meta.vitest name="zipping-streams-at-different-rates-1"
import { Stream, Schedule, Effect } from "effect"

const s1 = Stream.make(1, 2, 3).pipe(
  Stream.schedule(Schedule.spaced("1 second")),
)

const s2 = Stream.make("a", "b", "c", "d").pipe(
  Stream.schedule(Schedule.spaced("500 millis")),
)

const stream = Stream.zipLatest(s1, s2)

// The exact interleaving in the middle depends on real wall-clock timing,
// but `zipLatest` always waits for both sides to emit before starting (so
// the first pair is fixed) and both streams are exhausted together at the
// end (so the last pair is fixed too)
const zipLatestResults = await Effect.runPromise(Stream.runCollect(stream))
zipLatestResults[0] // => [1, "a"]
zipLatestResults.at(-1) // => [3, "d"]
```

### Pairing with Previous and Next Elements

| API                      | Description                                               |
| ------------------------ | --------------------------------------------------------- |
| `zipWithPrevious`        | Pairs each element of a stream with its previous element. |
| `zipWithNext`            | Pairs each element of a stream with its next element.     |
| `zipWithPreviousAndNext` | Pairs each element with both its previous and next.       |

**Example** (Pairing Stream Elements with Next)

```ts twoslash import.meta.vitest name="pairing-with-previous-and-next-elements-1"
import { Stream, Effect, Option } from "effect"

const stream = Stream.zipWithNext(Stream.make(1, 2, 3, 4))

await Effect.runPromise(Stream.runCollect(stream)) // => [[1, Option.some(2)], [2, Option.some(3)], [3, Option.some(4)], [4, Option.none()]]
```

### Indexing Stream Elements

The `Stream.zipWithIndex` operator is a helpful tool for indexing each element in a stream, pairing each item with its respective position in the sequence. This is particularly useful when you want to keep track of the order of elements within a stream.

**Example** (Indexing Each Element in a Stream)

```ts twoslash import.meta.vitest name="indexing-stream-elements-1"
import { Stream, Effect } from "effect"

const stream = Stream.zipWithIndex(
  Stream.make("Mary", "James", "Robert", "Patricia"),
)

await Effect.runPromise(Stream.runCollect(stream)) // => [["Mary", 0], ["James", 1], ["Robert", 2], ["Patricia", 3]]
```

## Cartesian Product of Streams

The Stream module includes a feature for computing the _Cartesian Product_ of two streams, allowing you to create combinations of elements from two different streams. This is helpful when you need to pair each element from one set with every element of another.

In simple terms, imagine you have two collections and want to form all possible pairs by picking one item from each. This pairing process is the Cartesian Product. In streams, this operation generates a new stream that includes every possible pairing of elements from the two input streams.

To create a Cartesian Product of two streams, the `Stream.cross` operator is available, along with similar variants. These operators combine two streams into a new stream of all possible element combinations.

**Example** (Creating a Cartesian Product of Two Streams)

```ts twoslash import.meta.vitest name="cartesian-product-of-streams-1"
import { Stream, Effect, Console } from "effect"

const s1 = Stream.make(1, 2, 3).pipe(Stream.tap(Console.log))
const s2 = Stream.make("a", "b").pipe(Stream.tap(Console.log))

const cartesianProduct = Stream.cross(s1, s2)

await Effect.runPromise(Stream.runCollect(cartesianProduct)) // => [[1, "a"], [1, "b"], [2, "a"], [2, "b"], [3, "a"], [3, "b"]]
```

<Aside type="caution" title="Multiple Iterations of Right Stream">
  Note that the right-hand stream (`s2` in this example) will be iterated over
  multiple times, once for each element in the left-hand stream (`s1`). If the
  right-hand stream involves expensive or side-effect-producing operations,
  those will be executed repeatedly.
</Aside>

## Partitioning

Partitioning a stream involves dividing it into two distinct streams based on a specified condition. The Stream module offers two functions for this purpose: `Stream.partition` and `Stream.partitionEffect`. Let's look at how these functions work and the best scenarios for their use.

### partition

The `Stream.partition` function takes a `Filter` as input and divides the original stream into two substreams. One substream will contain elements that meet the condition, while the other contains those that do not. Both resulting substreams are wrapped in a `Scope` type.

**Example** (Partitioning a Stream into Odd and Even Numbers)

```ts twoslash import.meta.vitest name="partition-1"
import { Stream, Effect, Filter } from "effect"

//      ┌─── Effect<[Stream<number>, Stream<number>], never, Scope>
//      ▼
const program = Stream.range(1, 9).pipe(
  Stream.partition(
    Filter.fromPredicate((n) => n % 2 === 0),
    { bufferSize: 5 },
  ),
)

await Effect.runPromise(
  Effect.scoped(
    Effect.gen(function* () {
      const [odds, evens] = yield* program
      return [yield* Stream.runCollect(odds), yield* Stream.runCollect(evens)]
    }),
  ),
) // => [[1, 3, 5, 7, 9], [2, 4, 6, 8]]
```

### partitionEffect

In some cases, you might need to partition a stream using a condition that involves an effect. For this, the `Stream.partitionEffect` function is ideal. This function uses an effectful `Filter` to split the stream into two substreams: one for elements that produce `Result.succeed` values and another for elements that produce `Result.fail` values.

**Example** (Partitioning a Stream with an Effectful Predicate)

```ts twoslash import.meta.vitest name="partitioneffect-1"
import { Stream, Effect, Filter, Result } from "effect"

//      ┌─── Effect<[Stream<number>, Stream<number>], never, Scope>
//      ▼
const program = Stream.range(1, 9).pipe(
  Stream.partitionEffect(
    // Simulate an effectful computation
    Filter.makeEffect((n: number) =>
      Effect.succeed(n % 2 === 0 ? Result.succeed(n) : Result.fail(n)),
    ),
    { capacity: 5 },
  ),
)

await Effect.runPromise(
  Effect.scoped(
    Effect.gen(function* () {
      const [evens, odds] = yield* program
      return [yield* Stream.runCollect(odds), yield* Stream.runCollect(evens)]
    }),
  ),
) // => [[1, 3, 5, 7, 9], [2, 4, 6, 8]]
```

## Grouping

When processing streams of data, you may need to group elements based on specific criteria. The Stream module provides two functions for this purpose: `groupByKey`, `groupBy`, `grouped` and `groupedWithin`. Let's review how these functions work and when to use each one.

### groupByKey

The `Stream.groupByKey` function partitions a stream based on a key function of type `(a: A) => K`, where `A` is the type of elements in the stream, and `K` represents the keys for grouping. This function is non-effectful and groups elements by simply applying the provided key function.

The result of `Stream.groupByKey` is an ordinary `Stream` of `readonly [K, Stream<V>]` pairs, representing the grouped stream. To process each group, you can use `Stream.flatMap`, passing a function of type `([key, stream]: [K, Stream<V, E>]) => Stream.Stream<...>` together with `{ concurrency: "unbounded" }`. This function operates across all groups and merges them together in a non-deterministic order.

**Example** (Grouping by Tens Place in Exam Scores)

In the following example, we use `Stream.groupByKey` to group exam scores by the tens place and count the number of scores in each group:

```ts twoslash import.meta.vitest name="groupbykey-1"
import { Stream, Effect } from "effect"

class Exam {
  constructor(
    readonly person: string,
    readonly score: number,
  ) {}
}

// Define a list of exam results
const examResults = [
  new Exam("Alex", 64),
  new Exam("Michael", 97),
  new Exam("Bill", 77),
  new Exam("John", 78),
  new Exam("Bobby", 71),
]

// Group exam results by the tens place in the score
const groupByKeyResult = Stream.fromIterable(examResults).pipe(
  Stream.groupByKey((exam) => Math.floor(exam.score / 10) * 10),
)

// Count the number of exam results in each group
const stream = groupByKeyResult.pipe(
  Stream.flatMap(
    ([key, stream]) =>
      Stream.fromEffect(
        Stream.runCollect(stream).pipe(
          Effect.map((values) => [key, values.length] as const),
        ),
      ),
    { concurrency: "unbounded" },
  ),
)

await Effect.runPromise(Stream.runCollect(stream)) // => [[60, 1], [90, 1], [70, 3]]
```

### groupBy

For more complex grouping requirements where partitioning involves effects, you can use the `Stream.groupBy` function. This function accepts an effectful partitioning function and returns an ordinary `Stream` of `readonly [K, Stream<V>]` pairs, representing the grouped stream. You can then process each group by using `Stream.flatMap`, similar to `Stream.groupByKey`.

**Example** (Grouping Names by First Letter)

In the following example, we group names by their first letter and count the number of names in each group. Here, the partitioning operation is set up as an effectful operation:

```ts twoslash import.meta.vitest name="groupby-1"
import { Stream, Effect } from "effect"

// Group names by their first letter
const groupByKeyResult = Stream.fromIterable([
  "Mary",
  "James",
  "Robert",
  "Patricia",
  "John",
  "Jennifer",
  "Rebecca",
  "Peter",
]).pipe(
  // Simulate an effectful groupBy operation
  Stream.groupBy((name) =>
    Effect.succeed([name.substring(0, 1), name] as const),
  ),
)

// Count the number of names in each group and display results
const stream = groupByKeyResult.pipe(
  Stream.flatMap(
    ([key, stream]) =>
      Stream.fromEffect(
        Stream.runCollect(stream).pipe(
          Effect.map((values) => [key, values.length] as const),
        ),
      ),
    { concurrency: "unbounded" },
  ),
)

await Effect.runPromise(Stream.runCollect(stream)) // => [["M", 1], ["J", 3], ["R", 2], ["P", 2]]
```

### grouped

The `Stream.grouped` function is ideal for dividing a stream into chunks of a specified size, making it easier to handle data in smaller, organized segments. This is particularly helpful when processing or displaying data in batches.

**Example** (Dividing a Stream into Chunks of 3 Elements)

```ts twoslash import.meta.vitest name="grouped-1"
import { Stream, Effect } from "effect"

// Create a stream of numbers and group them into chunks of 3
const stream = Stream.range(0, 8).pipe(Stream.grouped(3))

await Effect.runPromise(Stream.runCollect(stream)) // => [[0, 1, 2], [3, 4, 5], [6, 7, 8]]
```

### groupedWithin

The `Stream.groupedWithin` function allows for flexible grouping by creating chunks based on either a specified maximum size or a time interval, whichever condition is met first. This is especially useful for working with data where timing constraints are involved.

**Example** (Grouping by Size or Time Interval)

In this example, `Stream.groupedWithin(18, "1.5 seconds")` groups the stream into chunks whenever either 18 elements accumulate or 1.5 seconds elapse since the last chunk was created.

```ts twoslash import.meta.vitest name="groupedwithin-1"
import { Stream, Schedule, Effect } from "effect"

// Create a stream that repeats every second and group by size or time
const stream = Stream.range(0, 9).pipe(
  Stream.repeat(Schedule.spaced("1 second")),
  Stream.groupedWithin(18, "1.5 seconds"),
  Stream.take(3),
)

await Effect.runPromise(Stream.runCollect(stream)) // => [[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1, 2, 3, 4, 5, 6, 7], [8, 9, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]]
```

## Concatenation

In stream processing, you may need to combine the contents of multiple streams. The Stream module offers several operators to achieve this, including `Stream.concat`, `Stream.flatten`, and `Stream.flatMap`. Let's look at how each of these operators works.

### Simple Concatenation

The `Stream.concat` operator is a straightforward method for joining two streams. It returns a new stream that emits elements from the first stream (left-hand) followed by elements from the second stream (right-hand). This is helpful when you want to combine two streams in a specific sequence.

**Example** (Concatenating Two Streams Sequentially)

```ts twoslash import.meta.vitest name="simple-concatenation-1"
import { Stream, Effect } from "effect"

const stream = Stream.concat(Stream.make(1, 2, 3), Stream.make("a", "b"))

await Effect.runPromise(Stream.runCollect(stream)) // => [1, 2, 3, "a", "b"]
```

### Concatenating Multiple Streams

If you have multiple streams to concatenate, `Stream.flatten` provides an efficient way to combine them without manually chaining multiple `Stream.concat` operations. This function takes a stream of streams and returns a single stream containing the elements of each stream in sequence.

**Example** (Concatenating Multiple Streams)

```ts twoslash import.meta.vitest name="concatenating-multiple-streams-1"
import { Stream, Effect } from "effect"

const s1 = Stream.make(1, 2, 3)
const s2 = Stream.make("a", "b")
const s3 = Stream.make(true, false, false)

const stream = Stream.flatten(
  Stream.fromIterable<Stream.Stream<number | string | boolean>>([s1, s2, s3]),
)

await Effect.runPromise(Stream.runCollect(stream)) // => [1, 2, 3, "a", "b", true, false, false]
```

### Advanced Concatenation with flatMap

The `Stream.flatMap` operator allows for advanced concatenation by creating a stream where each element is generated
by applying a function of type `(a: A) => Stream<...>` to each output of the source stream.
This operator then concatenates all the resulting streams, effectively flattening them.

**Example** (Generating Repeated Elements with `Stream.flatMap`)

```ts twoslash import.meta.vitest name="advanced-concatenation-with-flatmap-1"
import { Stream, Effect } from "effect"

// Create a stream where each element is repeated 4 times
const stream = Stream.make(1, 2, 3).pipe(
  Stream.flatMap((a) => Stream.forever(Stream.succeed(a)).pipe(Stream.take(4))),
)

await Effect.runPromise(Stream.runCollect(stream)) // => [1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3]
```

If you need to perform the `flatMap` operation concurrently, you can use the [concurrency](/docs/v4/concurrency/basic-concurrency/#concurrency-options) option to control how many inner streams run simultaneously.

Additionally, you can use the `switch` option to implement a "switch" behavior where previous streams are automatically
cancelled when new elements arrive from the source stream. This is particularly useful when you only need the most recent
result and want to conserve resources by cancelling outdated operations.

**Example** (Using the `switch` option)

```ts twoslash import.meta.vitest name="advanced-concatenation-with-flatmap-2"
import { Stream, Effect, Console } from "effect"

// Helper function to create a stream with logging
const createStreamWithLogging = (n: number) =>
  Stream.fromEffect(
    Effect.gen(function* () {
      console.log(`Starting stream for value: ${n}`)
      const result = yield* Effect.delay(Effect.succeed(n), "500 millis")
      console.log(`Completed stream for value: ${result}`)
      return result
    }).pipe(
      Effect.onInterrupt(() =>
        Console.log(`Interrupted stream for value: ${n}`),
      ),
    ),
  )

// Without switch (default behavior):
// all streams run to completion
const stream1 = Stream.fromIterable([1, 2, 3]).pipe(
  Stream.flatMap(createStreamWithLogging),
)

// With switch behavior:
// only the last stream completes, previous streams
// are cancelled when new values arrive
const stream2 = Stream.fromIterable([1, 2, 3]).pipe(
  Stream.switchMap(createStreamWithLogging),
)

// Run examples sequentially to see the difference
await Effect.runPromise(
  Effect.gen(function* () {
    console.log("=== Without switch (all streams complete) ===")
    const result1 = yield* Stream.runCollect(stream1)
    console.log(result1)

    console.log("\n=== With switch (only last stream completes) ===")
    const result2 = yield* Stream.runCollect(stream2)
    console.log(result2)

    return [result1, result2]
  }),
) // => [[1, 2, 3], [3]]
```

The `switch` option is especially valuable for scenarios like search functionality, real-time data processing,
or any situation where you want to discard previous operations when new input arrives.

## Merging

Sometimes, you may want to interleave elements from two streams and create a single output stream. In such cases, `Stream.concat` isn't suitable because it waits for the first stream to complete before consuming the second. For interleaving elements as they become available, `Stream.merge` and its variants are designed for this purpose.

### merge

The `Stream.merge` operation combines elements from two source streams into a single stream, interleaving elements as they are produced. Unlike `Stream.concat`, `Stream.merge` does not wait for one stream to finish before starting the other.

**Example** (Interleaving Two Streams with `Stream.merge`)

```ts twoslash import.meta.vitest name="merge-1"
import { Schedule, Stream, Effect } from "effect"

// Create two streams with different emission intervals
const s1 = Stream.make(1, 2, 3).pipe(
  Stream.schedule(Schedule.spaced("100 millis")),
)
const s2 = Stream.make(4, 5, 6).pipe(
  Stream.schedule(Schedule.spaced("200 millis")),
)

// Merge s1 and s2 into a single stream that interleaves their values
const merged = Stream.merge(s1, s2)

// The relative order between the two streams can jitter under real
// scheduling, but each stream's own emission order is always preserved
const mergedValues = await Effect.runPromise(Stream.runCollect(merged))
mergedValues.filter((n) => n <= 3) // => [1, 2, 3]
mergedValues.filter((n) => n > 3) // => [4, 5, 6]
```

### Termination Strategy

When merging two streams, it's important to consider the termination strategy, especially if each stream has a different lifetime.
By default, `Stream.merge` waits for both streams to terminate before ending the merged stream. However, you can modify this behavior with `haltStrategy`, selecting from four termination strategies:

| Termination Strategy | Description                                                          |
| -------------------- | -------------------------------------------------------------------- |
| `"left"`             | The merged stream terminates when the left-hand stream terminates.   |
| `"right"`            | The merged stream terminates when the right-hand stream terminates.  |
| `"both"` (default)   | The merged stream terminates only when both streams have terminated. |
| `"either"`           | The merged stream terminates as soon as either stream terminates.    |

**Example** (Using `haltStrategy: "left"` to Control Stream Termination)

```ts twoslash import.meta.vitest name="termination-strategy-1"
import { Stream, Schedule, Effect } from "effect"

const s1 = Stream.range(1, 5).pipe(
  Stream.schedule(Schedule.spaced("100 millis")),
)
const s2 = Stream.forever(Stream.succeed(0)).pipe(
  Stream.schedule(Schedule.spaced("200 millis")),
)

const merged = Stream.merge(s1, s2, { haltStrategy: "left" })

await Effect.runPromise(Stream.runCollect(merged)) // => [1, 0, 2, 3, 0, 4, 5]
```

### mergeWith

In some cases, you may want to merge two streams while transforming their elements into a unified type. `Stream.merge` combined with `Stream.map` on each source stream is designed for this purpose, allowing you to specify transformation functions for each source stream.

**Example** (Merging and Transforming Two Streams)

```ts twoslash import.meta.vitest name="mergewith-1"
import { Schedule, Stream, Effect } from "effect"

const s1 = Stream.make("1", "2", "3").pipe(
  Stream.schedule(Schedule.spaced("100 millis")),
)
const s2 = Stream.make(4.1, 5.3, 6.2).pipe(
  Stream.schedule(Schedule.spaced("200 millis")),
)

const merged = Stream.merge(
  // Convert string elements from `s1` to integers
  Stream.map(s1, (s) => parseInt(s)),
  // Round down decimal elements from `s2`
  Stream.map(s2, (n) => Math.floor(n)),
)

const mergedResults = await Effect.runPromise(Stream.runCollect(merged))
mergedResults.length // => 6
```

## Interleaving

### interleave

The `Stream.interleave` operator lets you pull one element at a time from each of two streams, creating a new interleaved stream. If one stream finishes first, the remaining elements from the other stream continue to be pulled until both streams are exhausted.

**Example** (Basic Interleaving of Two Streams)

```ts twoslash import.meta.vitest name="interleave-1"
import { Stream, Effect } from "effect"

const s1 = Stream.make(1, 2, 3)
const s2 = Stream.make(4, 5, 6)

const stream = Stream.interleave(s1, s2)

await Effect.runPromise(Stream.runCollect(stream)) // => [1, 4, 2, 5, 3, 6]
```

### interleaveWith

For more complex interleaving, `Stream.interleaveWith` provides additional control by using a third stream of `boolean` values to dictate the interleaving pattern. When this stream emits `true`, an element is taken from the left-hand stream; otherwise, an element is taken from the right-hand stream.

**Example** (Custom Interleaving Logic Using `Stream.interleaveWith`)

```ts twoslash import.meta.vitest name="interleavewith-1"
import { Stream, Effect } from "effect"

const s1 = Stream.make(1, 3, 5, 7, 9)
const s2 = Stream.make(2, 4, 6, 8, 10)

// Define a boolean stream to control interleaving
const booleanStream = Stream.make(true, false, false).pipe(Stream.forever)

const stream = Stream.interleaveWith(s1, s2, booleanStream)

await Effect.runPromise(Stream.runCollect(stream)) // => [1, 2, 4, 3, 6, 8, 5, 10, 7, 9]
```

## Interspersing

Interspersing adds separators or affixes in a stream, useful for formatting or structuring data in streams.

### intersperse

The `Stream.intersperse` operator inserts a specified delimiter element between each pair of elements in a stream. This delimiter can be any chosen value and is added between each consecutive pair.

**Example** (Inserting Delimiters Between Stream Elements)

```ts twoslash import.meta.vitest name="intersperse-1"
import { Stream, Effect } from "effect"

// Create a stream of numbers and intersperse `0` between them
const stream = Stream.make(1, 2, 3, 4, 5).pipe(Stream.intersperse(0))

await Effect.runPromise(Stream.runCollect(stream)) // => [1, 0, 2, 0, 3, 0, 4, 0, 5]
```

### intersperseAffixes

For more complex needs, `Stream.intersperseAffixes` provides control over different affixes at the start, between elements, and at the end of the stream.

**Example** (Adding Affixes to a Stream)

```ts twoslash import.meta.vitest name="intersperseaffixes-1"
import { Stream, Effect } from "effect"

// Create a stream and add affixes:
// - `[` at the start
// - `|` between elements
// - `]` at the end
const stream = Stream.make(1, 2, 3, 4, 5).pipe(
  Stream.intersperseAffixes({
    start: "[",
    middle: "|",
    end: "]",
  }),
)

await Effect.runPromise(Stream.runCollect(stream)) // => ["[", 1, "|", 2, "|", 3, "|", 4, "|", 5, "]"]
```

## Broadcasting

Broadcasting a stream creates multiple downstream streams that each receive the same elements from the source stream. This is useful when you want to send each element to multiple consumers simultaneously. The upstream stream has a `capacity` parameter that sets the limit for how much it can get ahead before slowing down to match the speed of the slowest downstream stream.

**Example** (Broadcasting to Multiple Downstream Streams)

In the following example, we broadcast a stream of numbers to two downstream consumers. The first calculates the maximum value in the stream, while the second logs each number with a delay. The upstream stream's speed adjusts based on the slower logging stream:

```ts twoslash import.meta.vitest name="broadcasting-1"
import { Effect, Stream, Console, Schedule, Fiber } from "effect"

const numbers = Effect.scoped(
  Effect.gen(function* () {
    // Broadcast to 2 downstream consumers with a capacity of 5
    const [first, second] = yield* Stream.range(1, 20).pipe(
      Stream.tap((n) => Console.log(`Emit ${n} element before broadcasting`)),
      Stream.broadcastN({ n: 2, capacity: 5 }),
    )

    // First downstream stream: calculates maximum
    const fiber1 = yield* Stream.runFold(
      first,
      () => 0,
      (acc, e) => Math.max(acc, e),
    ).pipe(
      Effect.andThen((max) => Console.log(`Maximum: ${max}`)),
      Effect.forkChild,
    )

    // Second downstream stream: logs each element with a delay
    const fiber2 = yield* second.pipe(
      Stream.schedule(Schedule.spaced("1 second")),
      Stream.runForEach((n) => Console.log(`Logging to the Console: ${n}`)),
      Effect.forkChild,
    )

    // Wait for both fibers to complete
    yield* Fiber.join(fiber1).pipe(
      Effect.zip(Fiber.join(fiber2), { concurrent: true }),
    )
  }),
)

await Effect.runPromise(numbers) // => undefined
```

## Buffering

Effect streams use a pull-based model, allowing downstream consumers to control the rate at which they request elements. However, when there's a mismatch in the speed between the producer and the consumer, buffering can help balance their interaction. The `Stream.buffer` operator is designed to manage this, allowing the producer to keep working even if the consumer is slower. You can set a maximum buffer capacity using the `capacity` option.

### buffer

The `Stream.buffer` operator queues elements to allow the producer to work independently from the consumer, up to a specified capacity. This helps when a faster producer and a slower consumer need to operate smoothly without blocking each other.

**Example** (Using a Buffer to Handle Speed Mismatch)

```ts twoslash
import { Stream, Console, Schedule, Effect } from "effect"

const stream = Stream.range(1, 10).pipe(
  // Log each element before buffering
  Stream.tap((n) => Console.log(`before buffering: ${n}`)),
  // Buffer with a capacity of 4 elements
  Stream.buffer({ capacity: 4 }),
  // Log each element after buffering
  Stream.tap((n) => Console.log(`after buffering: ${n}`)),
  // Add a 5-second delay between each emission
  Stream.schedule(Schedule.spaced("5 seconds")),
)

Effect.runPromise(Stream.runCollect(stream)).then(console.log)
/*
Output:
before buffering: 1
before buffering: 2
before buffering: 3
before buffering: 4
before buffering: 5
before buffering: 6
after buffering: 1
after buffering: 2
before buffering: 7
after buffering: 3
before buffering: 8
after buffering: 4
before buffering: 9
after buffering: 5
before buffering: 10
...
*/
```

Different buffering options let you tailor the buffering strategy based on your use case:

| **Buffering Type**  | **Configuration**                            | **Description**                                               |
| ------------------- | -------------------------------------------- | ------------------------------------------------------------- |
| **Bounded Queue**   | `{ capacity: number }`                       | Limits the queue to a fixed size.                             |
| **Unbounded Queue** | `{ capacity: "unbounded" }`                  | Allows an unlimited number of buffered items.                 |
| **Sliding Queue**   | `{ capacity: number, strategy: "sliding" }`  | Keeps the most recent items, discarding older ones when full. |
| **Dropping Queue**  | `{ capacity: number, strategy: "dropping" }` | Keeps the earliest items, discarding new ones when full.      |

## Debouncing

Debouncing is a technique used to prevent a function from firing too frequently, which is particularly useful when a stream emits values rapidly but only the last value after a pause is needed.

The `Stream.debounce` function achieves this by delaying the emission of values until a specified time period has passed without any new values. If a new value arrives during the waiting period, the timer resets, and only the latest value will eventually be emitted after a pause.

**Example** (Debouncing a Stream of Rapidly Emitted Values)

```ts twoslash import.meta.vitest name="debouncing-1"
import { Stream, Effect } from "effect"

// Helper function to log with elapsed time since the last log
let last = Date.now()
const log = (message: string) =>
  Effect.sync(() => {
    const end = Date.now()
    console.log(`${message} after ${end - last}ms`)
    last = end
  })

const stream = Stream.make(1, 2, 3).pipe(
  // Emit the value 4 after 200 ms
  Stream.concat(
    Stream.fromEffect(Effect.sleep("200 millis").pipe(Effect.as(4))),
  ),
  // Continue with more rapid values
  Stream.concat(Stream.make(5, 6)),
  // Emit 7 after 150 ms
  Stream.concat(
    Stream.fromEffect(Effect.sleep("150 millis").pipe(Effect.as(7))),
  ),
  Stream.concat(Stream.make(8)),
  Stream.tap((n) => log(`Received ${n}`)),
  // Only emit values after a pause of at least 100 milliseconds
  Stream.debounce("100 millis"),
  Stream.tap((n) => log(`> Emitted ${n}`)),
)

await Effect.runPromise(Stream.runCollect(stream)) // => [3, 6, 8]
```

## Throttling

Throttling is a technique for regulating the rate at which elements are emitted from a stream. It helps maintain a steady data output pace, which is valuable in situations where data processing needs to occur at a consistent rate.

The `Stream.throttle` function uses the [token bucket algorithm](https://en.wikipedia.org/wiki/Token_bucket) to control the rate of stream emissions.

**Example** (Throttle Configuration)

```ts showLineNumbers=false
Stream.throttle({
  cost: () => 1,
  duration: "100 millis",
  units: 1,
})
```

In this configuration:

- Each chunk processed uses one token (`cost = () => 1`).
- Tokens are replenished at a rate of one token (`units: 1`) every 100 milliseconds (`duration: "100 millis"`).

<Aside type="caution" title="Throttling Applies to Chunks, Not Elements">
  Note that throttling operates on chunks rather than individual elements. The
  `cost` function sets the token cost for each chunk.
</Aside>

### Shape Strategy (Default)

The "shape" strategy moderates data flow by delaying chunk emissions until they comply with specified bandwidth constraints.
This strategy ensures that data throughput does not exceed defined limits, allowing for steady and controlled data emission.

**Example** (Applying Throttling with the Shape Strategy)

```ts twoslash import.meta.vitest name="shape-strategy-default-1"
import { Stream, Effect, Schedule } from "effect"

// Helper function to log with elapsed time since last log
let last = Date.now()
const log = (message: string) =>
  Effect.sync(() => {
    const end = Date.now()
    console.log(`${message} after ${end - last}ms`)
    last = end
  })

const stream = Stream.fromSchedule(Schedule.spaced("50 millis")).pipe(
  Stream.take(6),
  Stream.tap((n) => log(`Received ${n}`)),
  Stream.throttle({
    cost: (arr) => arr.length,
    duration: "100 millis",
    units: 1,
  }),
  Stream.tap((n) => log(`> Emitted ${n}`)),
)

await Effect.runPromise(Stream.runCollect(stream)) // => [0, 1, 2, 3, 4, 5]
```

### Enforce Strategy

The "enforce" strategy strictly regulates data flow by discarding chunks that exceed bandwidth constraints.

**Example** (Throttling with the Enforce Strategy)

```ts twoslash import.meta.vitest name="enforce-strategy-1"
import { Stream, Effect, Schedule } from "effect"

// Helper function to log with elapsed time since last log
let last = Date.now()
const log = (message: string) =>
  Effect.sync(() => {
    const end = Date.now()
    console.log(`${message} after ${end - last}ms`)
    last = end
  })

const stream = Stream.make(1, 2, 3, 4, 5, 6).pipe(
  Stream.schedule(Schedule.exponential("100 millis")),
  Stream.tap((n) => log(`Received ${n}`)),
  Stream.throttle({
    cost: (arr) => arr.length,
    duration: "1 second",
    units: 1,
    strategy: "enforce",
  }),
  Stream.tap((n) => log(`> Emitted ${n}`)),
)

await Effect.runPromise(Stream.runCollect(stream)) // => [1, 4, 5, 6]
```

### burst option

The `Stream.throttle` function offers a burst option that allows for temporary increases in data throughput beyond the set rate limits.
This option is set to greater than 0 to activate burst capability (default is 0, indicating no burst support).
The burst capacity provides additional tokens in the token bucket, enabling the stream to momentarily exceed its configured rate when bursts of data occur.

**Example** (Throttling with Burst Capacity)

```ts twoslash import.meta.vitest name="burst-option-1"
import { Effect, Schedule, Stream } from "effect"

// Helper function to log with elapsed time since last log
let last = Date.now()
const log = (message: string) =>
  Effect.sync(() => {
    const end = Date.now()
    console.log(`${message} after ${end - last}ms`)
    last = end
  })

const stream = Stream.fromSchedule(Schedule.spaced("10 millis")).pipe(
  Stream.take(20),
  Stream.tap((n) => log(`Received ${n}`)),
  Stream.throttle({
    cost: (arr) => arr.length,
    duration: "200 millis",
    units: 5,
    strategy: "enforce",
    burst: 2,
  }),
  Stream.tap((n) => log(`> Emitted ${n}`)),
)

// Exact emitted values depend on real wall-clock timing and vary between
// runs, but the "enforce" strategy only ever drops chunks. It never
// reorders or duplicates them, so the result is always a strictly
// increasing subsequence of 0..19 starting with 0
const burstResults = await Effect.runPromise(Stream.runCollect(stream))
burstResults[0] // => 0
burstResults.every((n, i) => i === 0 || n > burstResults[i - 1]) // => true
```

In this setup, the stream starts with a bucket containing 5 tokens, allowing the first five chunks to be emitted instantly.
The additional burst capacity of 2 accommodates further emissions momentarily, allowing for handling of subsequent data more flexibly.
Over time, as the bucket refills according to the throttle configuration, additional elements are emitted, demonstrating how the burst capability can manage uneven data flows effectively.

## Scheduling

When working with streams, you may need to introduce specific time intervals between each element's emission. The `Stream.schedule` combinator allows you to set these intervals.

**Example** (Adding a Delay Between Stream Emissions)

```ts twoslash import.meta.vitest name="scheduling-1"
import { Stream, Schedule, Console, Effect } from "effect"

// Create a stream that emits values with a 1-second delay between each
const stream = Stream.make(1, 2, 3, 4, 5).pipe(
  Stream.schedule(Schedule.spaced("1 second")),
  Stream.tap(Console.log),
)

await Effect.runPromise(Stream.runCollect(stream)) // => [1, 2, 3, 4, 5]
```

In this example, we've used the `Schedule.spaced("1 second")` schedule to introduce a one-second gap between each emission in the stream.
