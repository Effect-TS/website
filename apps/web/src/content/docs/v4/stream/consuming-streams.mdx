---
title: Consuming Streams
description: Learn techniques for consuming streams, including collecting elements, processing with callbacks, and using folds and sinks.
sidebar:
  order: 2
---

When working with streams, it's essential to understand how to consume the data they produce.
In this guide, we'll walk through several common methods for consuming streams.

## Using runCollect

To gather all the elements from a stream into an array, you can use the `Stream.runCollect` function.

```ts twoslash import.meta.vitest name="using-runcollect-1"
import { Stream, Effect } from "effect"

const stream = Stream.make(1, 2, 3, 4, 5)

const collectedData = Stream.runCollect(stream)

await Effect.runPromise(collectedData) // => [1, 2, 3, 4, 5]
```

## Using runForEach

Another way to consume elements of a stream is by using `Stream.runForEach`. It takes a callback function that receives each element of the stream. Here's an example:

```ts twoslash import.meta.vitest name="using-runforeach-1"
import { Stream, Effect, Console } from "effect"

const effect = Stream.make(1, 2, 3).pipe(
  Stream.runForEach((n) => Console.log(n)),
)

await Effect.runPromise(effect) // => undefined
```

In this example, we use `Stream.runForEach` to log each element to the console.

## Using runFold

`Stream.runFold` consumes a stream by reducing its values and returns an effect containing the result. For early termination, use `Stream.runForEachWhile` and keep the accumulator local to an `Effect.suspend` block.

```ts twoslash import.meta.vitest name="using-a-fold-operation-1"
import { Stream, Effect } from "effect"

const foldedStream = Stream.make(1, 2, 3, 4, 5).pipe(
  Stream.runFold(
    () => 0,
    (a, b) => a + b,
  ),
)

await Effect.runPromise(foldedStream) // => 15

const foldedWhileStream = Effect.suspend(() => {
  let acc = 0
  return Stream.make(1, 2, 3, 4, 5)
    .pipe(
      Stream.runForEachWhile((n) => {
        acc = acc + n
        return Effect.succeed(acc <= 3)
      }),
    )
    .pipe(Effect.map(() => acc))
})

await Effect.runPromise(foldedWhileStream) // => 6
```

In the first example, `Stream.runFold` calculates the sum of all elements. In the second, `Stream.runForEachWhile` stops after the accumulator exceeds `3`; the element that makes the predicate false has already been consumed, so the result is `6`.

## Using a Sink

To consume a stream using a Sink, you can pass the `Sink` to the `Stream.run` function. Here's an example:

```ts twoslash import.meta.vitest name="using-a-sink-1"
import { Stream, Sink, Effect } from "effect"

const effect = Stream.make(1, 2, 3).pipe(Stream.run(Sink.sum))

await Effect.runPromise(effect) // => 6
```

In this example, we use a `Sink` to calculate the sum of the elements in the stream.
