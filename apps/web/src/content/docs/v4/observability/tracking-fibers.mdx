---
title: Tracking Fibers
description: Track groups of fibers using FiberSet and FiberMap.
sidebar:
  order: 3
---

import { Aside } from "@astrojs/starlight/components"

Effect provides two structured-concurrency primitives for tracking groups of fibers: `FiberSet` for an unkeyed collection and `FiberMap` for a collection keyed by an arbitrary value. Both automatically remove fibers when they complete and interrupt any remaining fibers when their owning `Scope` closes.

## Tracking Fibers with FiberSet

A `FiberSet<A, E>` collects fibers so they can be observed, joined, or interrupted together. You add fibers to it with `FiberSet.run` (fork an effect and track the resulting fiber) or `FiberSet.add` (track a fiber you already forked), and inspect it with `FiberSet.size` or by iterating over it directly.

**Example** (Monitoring Fiber Count)

In this example, we periodically monitor the number of fibers running in the application while calculating a Fibonacci number. The program forks two child fibers for every recursive step, adding each to a shared `FiberSet`, while a separate monitor fiber logs the set's size on a schedule until the calculation finishes.

```ts twoslash import.meta.vitest name="monitoring-fiber-count"
import { Effect, Fiber, FiberSet, Schedule } from "effect"

// Main program that monitors fibers while calculating a Fibonacci number
const program = Effect.gen(function* () {
  // Create a FiberSet to track child fibers
  const set = yield* FiberSet.make<number>()

  // Start a Fibonacci calculation, forking every recursive step into the set
  const fibFiber = yield* Effect.forkChild(fib(10, set))

  // Start monitoring the fibers, logging the FiberSet's size every 20ms
  const monitorFiber = yield* Effect.forkChild(
    monitorFibers(set).pipe(Effect.repeat(Schedule.spaced("20 millis"))),
  )

  // Wait for the Fibonacci calculation to finish, then stop the monitor
  const result = yield* Fiber.join(fibFiber)
  yield* Fiber.interrupt(monitorFiber)

  console.log(`fibonacci result: ${result}`)
  // The final result is deterministic even though the intermediate
  // "number of fibers" logs above are racy and vary between runs
  result // => 55
}).pipe(Effect.scoped)

// Function to monitor and log the number of active fibers
const monitorFibers = (set: FiberSet.FiberSet<number>) =>
  Effect.gen(function* () {
    const count = yield* FiberSet.size(set) // Get the current number of tracked fibers
    console.log(`number of fibers: ${count}`)
  })

// Recursive Fibonacci calculation, adding a fiber to the set for each recursive step
const fib = (
  n: number,
  set: FiberSet.FiberSet<number>,
): Effect.Effect<number> =>
  Effect.gen(function* () {
    if (n <= 1) {
      return n
    }
    yield* Effect.sleep("30 millis") // Simulate work by delaying

    // Fork two fibers for the recursive Fibonacci calls, tracked by the FiberSet
    const fiber1 = yield* FiberSet.run(set, fib(n - 2, set))
    const fiber2 = yield* FiberSet.run(set, fib(n - 1, set))

    // Join the fibers to retrieve their results
    const v1 = yield* Fiber.join(fiber1)
    const v2 = yield* Fiber.join(fiber2)

    return v1 + v2 // Combine the results
  })

await Effect.runPromise(program)
/*
Example Output:
number of fibers: 0
number of fibers: 0
number of fibers: 2
number of fibers: 6
number of fibers: 6
number of fibers: 14
number of fibers: 30
number of fibers: 30
number of fibers: 55
number of fibers: 62
number of fibers: 62
number of fibers: 35
number of fibers: 8
number of fibers: 8
*/
```

<Aside type="tip" title="Reference documentation">
  For the full list of `FiberSet` operations, including `FiberSet.join` (fail
  the parent if any tracked fiber fails) and `FiberSet.awaitEmpty` (wait until
  every tracked fiber has completed), see the
  [FiberSet](/docs/v4/api/effect/FiberSet) module reference.
</Aside>

## Tracking Fibers with FiberMap

`FiberMap<K, A, E>` behaves like `FiberSet`, but each fiber is tracked under a key. This is useful when you need to look up, replace, or interrupt a specific fiber later, for example, one fiber per connected client, keyed by client ID. Setting a new fiber under a key that's already in use interrupts the previous one first.

For the full `FiberMap` API, see the [FiberMap](/docs/v4/api/effect/FiberMap) module reference.
