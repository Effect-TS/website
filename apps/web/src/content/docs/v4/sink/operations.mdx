---
title: Sink Operations
description: Explore operations to transform, filter, and adapt sinks, enabling custom input-output handling and element filtering in stream processing.
sidebar:
  label: Operations
  order: 2
---

In previous sections, we learned how to create and use sinks. Now, let's explore some operations that let you transform or filter sink behavior.

## Adapting Sink Input

At times, you may have a sink that works with one type of input, but your current stream uses a different type. The `Sink.mapInput` function helps you adapt your sink to a new input type by transforming the input values. While `Sink.map` changes the sink's output, `Sink.mapInput` changes the input it accepts.

**Example** (Converting String Input to Numeric for Summing)

Suppose you have a `Sink.sum` that calculates the sum of numbers. If your stream contains strings rather than numbers, `Sink.mapInput` can convert those strings into numbers, allowing `Sink.sum` to work with your stream:

```ts twoslash import.meta.vitest name="converting-string-input-to-numeric-for-summing-1"
import { Stream, Sink, Effect } from "effect"

// A stream of numeric strings
const stream = Stream.make("1", "2", "3", "4", "5")

// Define a sink for summing numeric values
const numericSum = Sink.sum

// Use mapInput to adapt the sink, converting strings to numbers
const stringSum = numericSum.pipe(
  Sink.mapInput((s: string) => Number.parseFloat(s)),
)

await Effect.runPromise(Stream.run(stream, stringSum)) // => 15
```

## Transforming Both Input and Output

When you need to transform both the input and output of a sink, combine `Sink.mapInput` with `Sink.map`. Together they let you transform the input type, perform the operation, and then transform the output to a new type. This can be useful for complete conversions between input and output types.

**Example** (Converting Input to Integer, Summing, and Converting Output to String)

```ts twoslash import.meta.vitest name="converting-input-to-integer-summing-and-converting-output-to-string-1"
import { Stream, Sink, Effect } from "effect"

// A stream of numeric strings
const stream = Stream.make("1", "2", "3", "4", "5")

// Convert string inputs to numbers, sum them,
// then convert the result to a string
const sumSink = Sink.sum.pipe(
  // Transform input: string to number
  Sink.mapInput((s: string) => Number.parseFloat(s)),
  // Transform output: number to string
  Sink.map((n) => String(n)),
)

await Effect.runPromise(Stream.run(stream, sumSink)) // => "15"
```

## Filtering Input

You can filter the elements a sink ends up processing by filtering the stream that feeds it, before handing it off with `Stream.transduce`. This lets you combine a filter with a sink like `Sink.take` that only cares about elements meeting certain criteria.

**Example** (Filtering Negative Numbers in Groups of Three)

In the example below, elements are collected into arrays of three, but only positive numbers are included:

```ts twoslash import.meta.vitest name="filtering-negative-numbers-in-chunks-of-three-1"
import { Stream, Sink, Effect } from "effect"

// Define a stream with positive, negative, and zero values
const stream = Stream.fromIterable([
  1, -2, 0, 1, 3, -3, 4, 2, 0, 1, -3, 1, 1, 6,
]).pipe(
  // Filter out non-positive numbers before grouping
  Stream.filter((n) => n > 0),
  // Collect the remaining elements in groups of 3
  Stream.transduce(Sink.take(3)),
)

await Effect.runPromise(Stream.runCollect(stream)) // => [[1, 1, 3], [4, 2, 1], [1, 1, 6], []]
```
