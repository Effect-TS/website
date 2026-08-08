---
title: Leftovers
description: Learn how to handle unconsumed elements in streams, collecting or ignoring leftovers for efficient data processing.
sidebar:
  order: 4
---

In this section, we'll look at handling elements left unconsumed by sinks. Sinks may process only a portion of the elements from an upstream source, leaving some elements as "leftovers." Here's how to collect or ignore these remaining elements.

## Collecting Leftovers

If a sink doesn't consume all elements from the upstream source, the remaining elements are called leftovers. `Sink.mapEnd` transforms both the sink result and its optional leftovers, so you can move the leftovers into the result returned by `Stream.run`.

**Example** (Collecting Leftover Elements)

```ts twoslash import.meta.vitest name="collecting-leftover-elements-1"
import { Stream, Sink, Effect, Option } from "effect"

const stream = Stream.make(1, 2, 3, 4, 5)

// Take the first 3 elements and collect any leftovers
const sink1 = Sink.take<number>(3).pipe(
  Sink.mapEnd(([a, leftover]) => [[a, leftover ?? []] as const]),
)

await Effect.runPromise(Stream.run(stream, sink1)) // => [[1, 2, 3], [4, 5]]

// Take only the first element and collect the rest as leftovers
const sink2 = Sink.head<number>().pipe(
  Sink.mapEnd(([a, leftover]) => [[a, leftover ?? []] as const]),
)

await Effect.runPromise(Stream.run(stream, sink2)) // => [Option.some(1), [2, 3, 4, 5]]
```

## Ignoring Leftovers

If leftover elements are not needed, you can ignore them using `Sink.ignoreLeftover`. This approach discards any unconsumed elements, so the sink operation focuses only on the elements it needs.

**Example** (Ignoring Leftover Elements)

```ts twoslash import.meta.vitest name="ignoring-leftover-elements-1"
import { Stream, Sink, Effect } from "effect"

const stream = Stream.make(1, 2, 3, 4, 5)

// Take the first 3 elements and ignore any remaining elements
const sink = Sink.take<number>(3).pipe(
  Sink.ignoreLeftover,
  Sink.mapEnd(([a, leftover]) => [[a, leftover ?? []] as const]),
)

await Effect.runPromise(Stream.run(stream, sink)) // => [[1, 2, 3], []]
```
