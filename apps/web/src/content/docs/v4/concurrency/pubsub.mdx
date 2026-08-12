---
title: PubSub
description: Effortless message broadcasting and asynchronous communication with PubSub in Effect.
sidebar:
  order: 6
---

import { Aside } from "@astrojs/starlight/components"

A `PubSub` serves as an asynchronous message hub, allowing publishers to send messages that can be received by all current subscribers.

Unlike a [Queue](/docs/v4/concurrency/queue/), where each value is delivered to only one consumer, a `PubSub` broadcasts each published message to all subscribers. This makes `PubSub` ideal for scenarios requiring message broadcasting rather than load distribution.

## Basic Operations

A `PubSub<A>` stores messages of type `A` and provides two fundamental operations:

| API                | Description                                                                                                                                                                                                                              |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PubSub.publish`   | Sends a message of type `A` to the `PubSub`, returning an effect indicating if the message was successfully published.                                                                                                                   |
| `PubSub.subscribe` | Creates a scoped effect that allows subscription to the `PubSub`, automatically unsubscribing when the scope ends. Subscribers receive messages through a [Dequeue](/docs/v4/concurrency/queue/#dequeue) which holds published messages. |

**Example** (Publishing a Message to Multiple Subscribers)

```ts twoslash import.meta.vitest name="basic-operations-1"
import { Effect, PubSub } from "effect"

const program = Effect.scoped(
  Effect.gen(function* () {
    const pubsub = yield* PubSub.bounded<string>(2)

    // Two subscribers
    const dequeue1 = yield* PubSub.subscribe(pubsub)
    const dequeue2 = yield* PubSub.subscribe(pubsub)

    // Publish a message to the pubsub
    yield* PubSub.publish(pubsub, "Hello from a PubSub!")

    // Each subscriber receives the message
    const message1 = yield* PubSub.take(dequeue1)
    const message2 = yield* PubSub.take(dequeue2)
    console.log("Subscriber 1: " + message1)
    console.log("Subscriber 2: " + message2)
    message1 // => "Hello from a PubSub!"
    message2 // => "Hello from a PubSub!"
  }),
)

await Effect.runPromise(program) // => undefined
```

<Aside type="caution" title="Subscribe Before Publishing">
  A subscriber only receives messages published while it is actively subscribed.
  To ensure a subscriber receives a particular message, establish the
  subscription before publishing the message.
</Aside>

## Creating a PubSub

### Bounded PubSub

A bounded `PubSub` applies back pressure to publishers when it reaches capacity, suspending additional publishing until space becomes available.

Back pressure ensures that all subscribers receive all messages while they are subscribed. However, it can lead to slower message delivery if a subscriber is slow.

**Example** (Bounded PubSub Creation)

```ts twoslash import.meta.vitest name="bounded-pubsub-1"
import { Effect, PubSub } from "effect"

// Creates a bounded PubSub with a capacity of 2
const boundedPubSub = PubSub.bounded<string>(2)

PubSub.capacity(await Effect.runPromise(boundedPubSub)) // => 2
```

### Dropping PubSub

A dropping `PubSub` discards new values when full. The `PubSub.publish` operation returns `false` if the message is dropped.

In a dropping pubsub, publishers can continue to publish new values, but subscribers are not guaranteed to receive all messages.

**Example** (Dropping PubSub Creation)

```ts twoslash import.meta.vitest name="dropping-pubsub-1"
import { Effect, PubSub } from "effect"

// Creates a dropping PubSub with a capacity of 2
const droppingPubSub = PubSub.dropping<string>(2)

PubSub.capacity(await Effect.runPromise(droppingPubSub)) // => 2
```

### Sliding PubSub

A sliding `PubSub` removes the oldest message to make space for new ones, ensuring that publishing never blocks.

A sliding pubsub prevents slow subscribers from impacting the message delivery rate. However, there's still a risk that slow subscribers may miss some messages.

**Example** (Sliding PubSub Creation)

```ts twoslash import.meta.vitest name="sliding-pubsub-1"
import { Effect, PubSub } from "effect"

// Creates a sliding PubSub with a capacity of 2
const slidingPubSub = PubSub.sliding<string>(2)

PubSub.capacity(await Effect.runPromise(slidingPubSub)) // => 2
```

### Unbounded PubSub

An unbounded `PubSub` has no capacity limit, so publishing always succeeds immediately.

Unbounded pubsubs guarantee that all subscribers receive all messages without slowing down message delivery. However, they can grow indefinitely if messages are published faster than they are consumed.

Generally, it's recommended to use bounded, dropping, or sliding pubsubs unless you have specific use cases for unbounded pubsubs.

**Example**

```ts twoslash import.meta.vitest name="unbounded-pubsub-1"
import { Effect, PubSub } from "effect"

// Creates an unbounded PubSub with unlimited capacity
const unboundedPubSub = PubSub.unbounded<string>()

PubSub.capacity(await Effect.runPromise(unboundedPubSub)) // => Number.MAX_SAFE_INTEGER
```

## Operators On PubSubs

### publishAll

The `PubSub.publishAll` function lets you publish multiple values to the pubsub at once.

**Example** (Publishing Multiple Messages)

```ts twoslash import.meta.vitest name="publishall-1"
import { Effect, PubSub } from "effect"

const program = Effect.scoped(
  Effect.gen(function* () {
    const pubsub = yield* PubSub.bounded<string>(2)
    const dequeue = yield* PubSub.subscribe(pubsub)
    yield* PubSub.publishAll(pubsub, ["Message 1", "Message 2"])
    const messages = yield* PubSub.takeAll(dequeue)
    console.log(messages)
    messages // => ["Message 1", "Message 2"]
  }),
)

await Effect.runPromise(program) // => undefined
```

### capacity / size

You can check the capacity and current size of a pubsub using `PubSub.capacity` and `PubSub.size`, respectively.

Note that `PubSub.capacity` returns a `number` because the capacity is set at pubsub creation and never changes.
In contrast, `PubSub.size` returns an effect that determines the current size of the pubsub since the number of messages in the pubsub can change over time.

**Example** (Retrieving PubSub Capacity and Size)

```ts twoslash import.meta.vitest name="capacity-size-1"
import { Effect, PubSub } from "effect"

const program = Effect.gen(function* () {
  const pubsub = yield* PubSub.bounded<number>(2)
  console.log(`capacity: ${PubSub.capacity(pubsub)}`)
  const capacityMessage = `capacity: ${PubSub.capacity(pubsub)}` // => "capacity: 2"
  console.log(`size: ${yield* PubSub.size(pubsub)}`)
  const sizeMessage = `size: ${yield* PubSub.size(pubsub)}` // => "size: 0"
})

await Effect.runPromise(program) // => undefined
```

### Shutting Down a PubSub

To shut down a pubsub, use `PubSub.shutdown`. You can also verify if it has been shut down with `PubSub.isShutdown`, or wait for the shutdown to complete with `PubSub.awaitShutdown`. Shutting down a pubsub also terminates all associated queues, ensuring that the shutdown signal is effectively communicated.
