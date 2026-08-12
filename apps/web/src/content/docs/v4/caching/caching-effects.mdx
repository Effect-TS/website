---
title: Caching Effects
description: Efficiently manage caching and memoization of effects with reusable tools.
sidebar:
  order: 0
---

This section covers several functions from the library that help manage caching and memoization in your application.

## Memoizing a Function

To memoize an effectful function, create a `Cache` whose `lookup` is the function to memoize, then call `Cache.get` for each input. The cache stores one result per input, so calling the function again with the same input reuses the cached result instead of recomputing it.

**Example** (Memoizing a Function with Cache)

```ts twoslash import.meta.vitest name="memoizing-a-function-with-cache-1"
import { Cache, Effect } from "effect"

let i = 1

// Simulating a task whose result changes on each call
const randomNumber = (n: number) => Effect.sync(() => n + i++)

const program = Effect.gen(function* () {
  console.log("non-memoized version:")
  const a = yield* randomNumber(10) // Computes a new result
  console.log(a)
  const b = yield* randomNumber(10) // Computes a different result
  console.log(b)

  console.log("memoized version:")
  const cache = yield* Cache.make({
    capacity: Number.MAX_SAFE_INTEGER,
    lookup: randomNumber,
  })
  const memoized = (n: number) => Cache.get(cache, n)
  const c = yield* memoized(10) // Computes and caches the result
  console.log(c)
  const d = yield* memoized(10) // Reuses the cached result
  console.log(d)

  return { a, b, c, d }
})

const result = await Effect.runPromise(program)
result // => { a: 11, b: 12, c: 13, d: 13 }
```

## once

Ensures an effect is executed only once, even if invoked multiple times.

**Example** (Single Execution of an Effect)

```ts twoslash import.meta.vitest name="single-execution-of-an-effect-1"
import { Effect, Console } from "effect"

const program = Effect.gen(function* () {
  const task1 = Console.log("task1")

  // Repeats task1 three times
  yield* Effect.repeat(task1, { times: 2 })

  // Ensures task2 is executed only once
  const task2 = yield* Effect.cached(Console.log("task2"))

  // Attempts to repeat task2, but it will only execute once
  yield* Effect.repeat(task2, { times: 2 })
})

const result = await Effect.runPromise(program)
/*
Output:
task1
task1
task1
task2
*/
result // => undefined
```

## cached

Returns an effect that computes a result lazily and caches it. Subsequent evaluations of this effect will return the cached result without re-executing the logic.

**Example** (Lazy Caching of an Expensive Task)

```ts twoslash import.meta.vitest name="lazy-caching-of-an-expensive-task-1"
import { Effect, Console } from "effect"

let i = 1

// Simulating an expensive task with a delay
const expensiveTask = Effect.promise<string>(() => {
  console.log("expensive task...")
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(`result ${i++}`)
    }, 100)
  })
})

const program = Effect.gen(function* () {
  // Without caching, the task is executed each time
  console.log("-- non-cached version:")
  yield* expensiveTask.pipe(Effect.andThen(Console.log))
  yield* expensiveTask.pipe(Effect.andThen(Console.log))

  // With caching, the result is reused after the first run
  console.log("-- cached version:")
  const cached = yield* Effect.cached(expensiveTask)
  yield* cached.pipe(Effect.andThen(Console.log))
  yield* cached.pipe(Effect.andThen(Console.log))
})

const result = await Effect.runPromise(program)
/*
Output:
-- non-cached version:
expensive task...
result 1
expensive task...
result 2
-- cached version:
expensive task...
result 3
result 3
*/
result // => undefined
```

## cachedWithTTL

Returns an effect that caches its result for a specified duration, known as the `timeToLive`. When the cache expires after the duration, the effect will be recomputed upon next evaluation.

**Example** (Caching with Time-to-Live)

```ts twoslash import.meta.vitest name="caching-with-time-to-live-1"
import { Effect, Console } from "effect"

let i = 1

// Simulating an expensive task with a delay
const expensiveTask = Effect.promise<string>(() => {
  console.log("expensive task...")
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(`result ${i++}`)
    }, 100)
  })
})

const program = Effect.gen(function* () {
  // Caches the result for 150 milliseconds
  const cached = yield* Effect.cachedWithTTL(expensiveTask, "150 millis")

  // First evaluation triggers the task
  yield* cached.pipe(Effect.andThen(Console.log))

  // Second evaluation returns the cached result
  yield* cached.pipe(Effect.andThen(Console.log))

  // Wait for 200 milliseconds, ensuring the cache expires
  yield* Effect.sleep("200 millis")

  // Recomputes the task after cache expiration
  yield* cached.pipe(Effect.andThen(Console.log))
})

const result = await Effect.runPromise(program)
/*
Output:
expensive task...
result 1
result 1
expensive task...
result 2
*/
result // => undefined
```

## cachedInvalidateWithTTL

Similar to `Effect.cachedWithTTL`, this function caches an effect's result for a specified duration. It also includes an additional effect for manually invalidating the cached value before it naturally expires.

**Example** (Invalidating Cache Manually)

```ts twoslash import.meta.vitest name="invalidating-cache-manually-1"
import { Effect, Console } from "effect"

let i = 1

// Simulating an expensive task with a delay
const expensiveTask = Effect.promise<string>(() => {
  console.log("expensive task...")
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(`result ${i++}`)
    }, 100)
  })
})

const program = Effect.gen(function* () {
  // Caches the result for 150 milliseconds
  const [cached, invalidate] = yield* Effect.cachedInvalidateWithTTL(
    expensiveTask,
    "150 millis",
  )

  // First evaluation triggers the task
  yield* cached.pipe(Effect.andThen(Console.log))

  // Second evaluation returns the cached result
  yield* cached.pipe(Effect.andThen(Console.log))

  // Invalidate the cache before it naturally expires
  yield* invalidate

  // Third evaluation triggers the task again
  // since the cache was invalidated
  yield* cached.pipe(Effect.andThen(Console.log))
})

const result = await Effect.runPromise(program)
/*
Output:
expensive task...
result 1
result 1
expensive task...
result 2
*/
result // => undefined
```
