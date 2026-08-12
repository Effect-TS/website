---
title: SubscriptionRef
description: Learn how to manage shared state with SubscriptionRef in Effect, enabling multiple observers to subscribe to and react to state changes efficiently in concurrent environments.
sidebar:
  order: 2
---

A `SubscriptionRef<A>` is a specialized form of a [SynchronizedRef](/docs/v4/state-management/synchronizedref/). It allows us to subscribe and receive updates on the current value and any changes made to that value.

```ts showLineNumbers=false
interface SubscriptionRef<A> {
  readonly value: A
}

/**
 * A stream containing the current value of the `Ref` as well as all changes
 * to that value.
 */
declare const changes: <A>(self: SubscriptionRef<A>) => Stream<A>
```

You can perform all standard operations on a `SubscriptionRef`, such as `get`, `set`, or `modify` to interact with the current value.

The key feature of `SubscriptionRef` is its `changes` stream. This stream allows you to observe the current value at the moment of subscription and receive all subsequent changes. Every time the stream is run, it emits the current value and tracks future updates.

To create a `SubscriptionRef`, you can use the `SubscriptionRef.make` constructor, specifying the initial value:

**Example** (Creating a `SubscriptionRef`)

```ts twoslash import.meta.vitest name="subscriptionref-1"
import { SubscriptionRef, Effect } from "effect"

const ref = SubscriptionRef.make(0)

await Effect.runPromise(Effect.map(ref, (r) => r.value)) // => 0
```

`SubscriptionRef` is particularly useful for modeling shared state when multiple observers need to react to changes. For example, in functional reactive programming, the `SubscriptionRef` could represent a portion of the application state, and various observers (like UI components) would update in response to state changes.

**Example** (Server-Client Model with `SubscriptionRef`)

In the following example, a "server" continually updates a shared value, while multiple "clients" observe the changes:

```ts twoslash import.meta.vitest name="subscriptionref-2"
import { SubscriptionRef, Effect, Fiber } from "effect"

// Server function that increments a shared value forever
const server = (ref: SubscriptionRef.SubscriptionRef<number>) =>
  SubscriptionRef.update(ref, (n) => n + 1).pipe(Effect.forever)

// Run the server briefly, then interrupt it, to confirm it does increment
await Effect.runPromise(
  Effect.gen(function* () {
    const ref = yield* SubscriptionRef.make(0)
    const fiber = yield* Effect.forkChild(server(ref))
    yield* Effect.sleep("50 millis")
    yield* Fiber.interrupt(fiber)
    return (yield* SubscriptionRef.get(ref)) > 0
  }),
) // => true
```

The `server` function operates on a regular `Ref` and continuously updates the value. It doesn't need to know about `SubscriptionRef` directly.

Next, let's define a `client` that subscribes to changes and collects a specified number of values:

```ts twoslash import.meta.vitest name="subscriptionref-3"
import { SubscriptionRef, Effect, Stream, Random } from "effect"

// Server function that increments a shared value forever
const server = (ref: SubscriptionRef.SubscriptionRef<number>) =>
  SubscriptionRef.update(ref, (n) => n + 1).pipe(Effect.forever)

// Client function that observes the stream of changes
const client = (changes: Stream.Stream<number>) =>
  Effect.gen(function* () {
    const n = yield* Random.nextIntBetween(1, 10)
    const chunk = yield* Stream.runCollect(Stream.take(changes, n))
    return chunk
  })

// Exercise client with a deterministic (seeded) source stream
const testStream = Stream.iterate(1, (n) => n + 1)
await Effect.runPromise(client(testStream).pipe(Random.withSeed("seed"))) // => [1, 2]
```

Similarly, the `client` function only works with a `Stream` of values and doesn't concern itself with the source of these values.

To tie everything together, we start the server, launch multiple client instances in parallel, and then shut down the server when we're finished. We also create the `SubscriptionRef` in this process.

```ts twoslash import.meta.vitest name="subscriptionref-4"
import { Effect, Stream, Random, SubscriptionRef, Fiber } from "effect"

// Server function that increments a shared value forever
const server = (ref: SubscriptionRef.SubscriptionRef<number>) =>
  SubscriptionRef.update(ref, (n) => n + 1).pipe(Effect.forever)

// Client function that observes the stream of changes
const client = (changes: Stream.Stream<number>) =>
  Effect.gen(function* () {
    const n = yield* Random.nextIntBetween(1, 10)
    const chunk = yield* Stream.runCollect(Stream.take(changes, n))
    return chunk
  })

const program = Effect.gen(function* () {
  // Create a SubscriptionRef with an initial value of 0
  const ref = yield* SubscriptionRef.make(0)

  // Fork the server to run concurrently
  const serverFiber = yield* Effect.forkChild(server(ref))

  // Create 5 clients that subscribe to the changes stream
  const clients = new Array(5)
    .fill(null)
    .map(() => client(SubscriptionRef.changes(ref)))

  // Run all clients in concurrently and collect their results
  const chunks = yield* Effect.all(clients, { concurrency: "unbounded" })

  // Interrupt the server when clients are done
  yield* Fiber.interrupt(serverFiber)

  // Output the results collected by each client
  for (const chunk of chunks) {
    console.log(chunk)
  }
})

Effect.runPromise(program)
/*
Example Output:
[ 4, 5, 6, 7, 8, 9 ]
[ 4 ]
[ 4, 5, 6, 7, 8, 9 ]
[ 4, 5 ]
[ 4, 5, 6, 7, 8, 9 ]
*/

// The chunk contents and their interleaving are non-deterministic, but each
// of the 5 clients always contributes exactly one chunk
const chunkCount = await Effect.runPromise(
  Effect.gen(function* () {
    const ref = yield* SubscriptionRef.make(0)
    const serverFiber = yield* Effect.forkChild(server(ref))
    const clients = new Array(5)
      .fill(null)
      .map(() => client(SubscriptionRef.changes(ref)))
    const chunks = yield* Effect.all(clients, { concurrency: "unbounded" })
    yield* Fiber.interrupt(serverFiber)
    return chunks.length
  }),
)
chunkCount // => 5
```

This setup ensures that each client observes the current value when it starts and receives all subsequent changes to the value.

Since the changes are represented as streams, you can easily build more complex programs using familiar stream operators. You can transform, filter, or merge these streams with other streams to achieve more sophisticated behavior.
