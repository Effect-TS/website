---
title: Schedule Combinators
description: Learn how to combine and customize schedules in Effect to create complex recurrence patterns, including union, intersection, sequencing, and more.
sidebar:
  order: 3
---

import { Aside } from "@astrojs/starlight/components"

Schedules define stateful, possibly effectful, recurring schedules of events, and compose in a variety of ways. Combinators allow us to take schedules and combine them together to get other schedules.

To demonstrate the functionality of different schedules, we will use the following helper function that logs the delay between executions.

```ts twoslash collapse={7-33}
import { Effect, Schedule, TestClock, Fiber, TestContext } from "effect"

const log = <A, Out>(
  action: Effect.Effect<A>,
  schedule: Schedule.Schedule<Out, void>
): void => {
  let start = 0
  let i = 0

  Effect.gen(function* () {
    const fiber: Fiber.RuntimeFiber<[Out, number]> = yield* Effect.gen(
      function* () {
        yield* action
        const now = yield* TestClock.currentTimeMillis
        console.log(
          i === 0
            ? `delay: ${now - start}`
            : i === 10
            ? "..."
            : `#${i} delay: ${now - start}`
        )
        i++
        start = now
      }
    ).pipe(
      Effect.repeat(
        schedule.pipe(Schedule.intersect(Schedule.recurs(10)))
      ),
      Effect.fork
    )
    yield* TestClock.adjust(Infinity)
    yield* Fiber.join(fiber)
  }).pipe(Effect.provide(TestContext.TestContext), Effect.runPromise)
}
```

<Aside type="note" title="Implementation Details">
  The `log` helper uses [TestClock](/docs/testing/testclock/) to simulate
  time passing. This allows us to observe the behavior of schedules as if
  time were advancing in a real-world scenario.
</Aside>

## Composition

Schedules can be composed in different ways:

| Mode             | Description                                                                                        |
| ---------------- | -------------------------------------------------------------------------------------------------- |
| **Union**        | Combines two schedules and recurs if either schedule wants to continue, using the shorter delay.   |
| **Intersection** | Combines two schedules and recurs only if both schedules want to continue, using the longer delay. |
| **Sequencing**   | Combines two schedules by running the first one fully, then switching to the second.               |

### Union

Combines two schedules using union. The schedule recurs as long as one of the schedules wants to, using the minimum delay between recurrences.

**Example** (Union of Exponential and Spaced Schedules)

```ts twoslash collapse={3-34}
import { Effect, Schedule, TestClock, Fiber, TestContext } from "effect"

const log = <A, Out>(
  action: Effect.Effect<A>,
  schedule: Schedule.Schedule<Out, void>
): void => {
  let start = 0
  let i = 0

  Effect.gen(function* () {
    const fiber: Fiber.RuntimeFiber<[Out, number]> = yield* Effect.gen(
      function* () {
        yield* action
        const now = yield* TestClock.currentTimeMillis
        console.log(
          i === 0
            ? `delay: ${now - start}`
            : i === 10
            ? "..."
            : `#${i} delay: ${now - start}`
        )
        i++
        start = now
      }
    ).pipe(
      Effect.repeat(
        schedule.pipe(Schedule.intersect(Schedule.recurs(10)))
      ),
      Effect.fork
    )
    yield* TestClock.adjust(Infinity)
    yield* Fiber.join(fiber)
  }).pipe(Effect.provide(TestContext.TestContext), Effect.runPromise)
}

const schedule = Schedule.union(
  Schedule.exponential("100 millis"),
  Schedule.spaced("1 second")
)
const action = Effect.void
log(action, schedule)
/*
Output:
delay: 0
#1 delay: 100  < exponential
#2 delay: 200
#3 delay: 400
#4 delay: 800
#5 delay: 1000 < spaced
#6 delay: 1000
#7 delay: 1000
#8 delay: 1000
#9 delay: 1000
...
*/
```

When we use the combined schedule with `Effect.repeat`, we observe that the effect is executed repeatedly based on the minimum delay between the two schedules. In this case, the delay alternates between the exponential schedule (increasing delay) and the spaced schedule (constant delay).

### Intersection

Combines two schedules using intersection. The schedule recurs only if both schedules want to continue, using the maximum delay between them.

**Example** (Intersection of Exponential and Recurs Schedules)

```ts twoslash collapse={3-34}
import { Effect, Schedule, TestClock, Fiber, TestContext } from "effect"

const log = <A, Out>(
  action: Effect.Effect<A>,
  schedule: Schedule.Schedule<Out, void>
): void => {
  let start = 0
  let i = 0

  Effect.gen(function* () {
    const fiber: Fiber.RuntimeFiber<[Out, number]> = yield* Effect.gen(
      function* () {
        yield* action
        const now = yield* TestClock.currentTimeMillis
        console.log(
          i === 0
            ? `delay: ${now - start}`
            : i === 10
            ? "..."
            : `#${i} delay: ${now - start}`
        )
        i++
        start = now
      }
    ).pipe(
      Effect.repeat(
        schedule.pipe(Schedule.intersect(Schedule.recurs(10)))
      ),
      Effect.fork
    )
    yield* TestClock.adjust(Infinity)
    yield* Fiber.join(fiber)
  }).pipe(Effect.provide(TestContext.TestContext), Effect.runPromise)
}

const schedule = Schedule.intersect(
  Schedule.exponential("10 millis"),
  Schedule.recurs(5)
)

const action = Effect.void

log(action, schedule)
/*
Output:
delay: 0
#1 delay: 10  < exponential
#2 delay: 20
#3 delay: 40
#4 delay: 80
#5 delay: 160
(end)         < recurs
*/
```

When we use the combined schedule with `Effect.repeat`, we observe that the effect is executed repeatedly only if both schedules want it to recur. The delay between recurrences is determined by the maximum delay between the two schedules. In this case, the delay follows the progression of the exponential schedule until the maximum number of recurrences specified by the recursive schedule is reached.

### Sequencing

Combines two schedules in sequence. First, it follows the policy of the first schedule, then switches to the second schedule once the first completes.

**Example** (Sequencing Recurs and Spaced Schedules)

```ts twoslash collapse={3-34}
import { Effect, Schedule, TestClock, Fiber, TestContext } from "effect"

const log = <A, Out>(
  action: Effect.Effect<A>,
  schedule: Schedule.Schedule<Out, void>
): void => {
  let start = 0
  let i = 0

  Effect.gen(function* () {
    const fiber: Fiber.RuntimeFiber<[Out, number]> = yield* Effect.gen(
      function* () {
        yield* action
        const now = yield* TestClock.currentTimeMillis
        console.log(
          i === 0
            ? `delay: ${now - start}`
            : i === 10
            ? "..."
            : `#${i} delay: ${now - start}`
        )
        i++
        start = now
      }
    ).pipe(
      Effect.repeat(
        schedule.pipe(Schedule.intersect(Schedule.recurs(10)))
      ),
      Effect.fork
    )
    yield* TestClock.adjust(Infinity)
    yield* Fiber.join(fiber)
  }).pipe(Effect.provide(TestContext.TestContext), Effect.runPromise)
}

const schedule = Schedule.andThen(
  Schedule.recurs(5),
  Schedule.spaced("1 second")
)

const action = Effect.void

log(action, schedule)
/*
Output:
delay: 0
#1 delay: 0    < recurs
#2 delay: 0
#3 delay: 0
#4 delay: 0
#5 delay: 0
#6 delay: 1000 < spaced
#7 delay: 1000
#8 delay: 1000
#9 delay: 1000
...
*/
```

When we use the combined schedule with `Effect.repeat`, we observe that the effect follows the policy of the first schedule (recurs) until it completes the specified number of recurrences. After that, it switches to the policy of the second schedule (spaced) and continues repeating the effect with the fixed delay between recurrences.

## Jittering

A `jittered` is a combinator that takes one schedule and returns another schedule of the same type except for the delay which is applied randomly

When a resource is out of service due to overload or contention, retrying and backing off doesn't help us. If all failed API calls are backed off to the same point of time, they cause another overload or contention. Jitter adds some amount of randomness to the delay of the schedule. This helps us to avoid ending up accidentally synchronizing and taking the service down by accident.

[Research](https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/) shows that `Schedule.jittered(0.0, 1.0)` is very suitable for retrying.

**Example** (Jittered Exponential Schedule)

```ts twoslash collapse={3-34}
import { Effect, Schedule, TestClock, Fiber, TestContext } from "effect"

const log = <A, Out>(
  action: Effect.Effect<A>,
  schedule: Schedule.Schedule<Out, void>
): void => {
  let start = 0
  let i = 0

  Effect.gen(function* () {
    const fiber: Fiber.RuntimeFiber<[Out, number]> = yield* Effect.gen(
      function* () {
        yield* action
        const now = yield* TestClock.currentTimeMillis
        console.log(
          i === 0
            ? `delay: ${now - start}`
            : i === 10
            ? "..."
            : `#${i} delay: ${now - start}`
        )
        i++
        start = now
      }
    ).pipe(
      Effect.repeat(
        schedule.pipe(Schedule.intersect(Schedule.recurs(10)))
      ),
      Effect.fork
    )
    yield* TestClock.adjust(Infinity)
    yield* Fiber.join(fiber)
  }).pipe(Effect.provide(TestContext.TestContext), Effect.runPromise)
}

const schedule = Schedule.jittered(Schedule.exponential("10 millis"))

const action = Effect.void

log(action, schedule)
/*
Output:
delay: 0
#1 delay: 9.006765
#2 delay: 20.549507999999996
#3 delay: 45.86659000000001
#4 delay: 77.055037
#5 delay: 178.06722299999998
#6 delay: 376.056965
#7 delay: 728.732785
#8 delay: 1178.174953
#9 delay: 2331.4659370000004
...
*/
```

In this example, we use the `jittered` combinator to apply jitter to an exponential schedule. The exponential schedule increases the delay between each repetition exponentially. By adding jitter to the schedule, the delays become randomly adjusted within a certain range.

## Filtering

Schedules can be filtered using `Schedule.whileInput` or `Schedule.whileOutput` to control repetition based on input or output conditions.

**Example** (Filtering Output)

```ts twoslash collapse={3-34}
import { Effect, Schedule, TestClock, Fiber, TestContext } from "effect"

const log = <A, Out>(
  action: Effect.Effect<A>,
  schedule: Schedule.Schedule<Out, void>
): void => {
  let start = 0
  let i = 0

  Effect.gen(function* () {
    const fiber: Fiber.RuntimeFiber<[Out, number]> = yield* Effect.gen(
      function* () {
        yield* action
        const now = yield* TestClock.currentTimeMillis
        console.log(
          i === 0
            ? `delay: ${now - start}`
            : i === 10
            ? "..."
            : `#${i} delay: ${now - start}`
        )
        i++
        start = now
      }
    ).pipe(
      Effect.repeat(
        schedule.pipe(Schedule.intersect(Schedule.recurs(10)))
      ),
      Effect.fork
    )
    yield* TestClock.adjust(Infinity)
    yield* Fiber.join(fiber)
  }).pipe(Effect.provide(TestContext.TestContext), Effect.runPromise)
}

const schedule = Schedule.whileOutput(Schedule.recurs(5), (n) => n <= 2)

const action = Effect.void

log(action, schedule)
/*
Output:
delay: 0
#1 delay: 0 < recurs
#2 delay: 0
#3 delay: 0
(end)       < whileOutput
*/
```

In this example, we create a schedule using `Schedule.recurs(5)` to repeat a certain action up to 5 times. However, we apply the `whileOutput` combinator with a predicate that filters out outputs greater than 2. As a result, the schedule stops producing outputs once the value exceeds 2, and the repetition ends.

## Modifying

The `Schedule.modifyDelay` combinator allows you to adjust the delay of a schedule.

**Example** (Modified Delay Schedule)

```ts twoslash collapse={3-34}
import { Effect, Schedule, TestClock, Fiber, TestContext } from "effect"

const log = <A, Out>(
  action: Effect.Effect<A>,
  schedule: Schedule.Schedule<Out, void>
): void => {
  let start = 0
  let i = 0

  Effect.gen(function* () {
    const fiber: Fiber.RuntimeFiber<[Out, number]> = yield* Effect.gen(
      function* () {
        yield* action
        const now = yield* TestClock.currentTimeMillis
        console.log(
          i === 0
            ? `delay: ${now - start}`
            : i === 10
            ? "..."
            : `#${i} delay: ${now - start}`
        )
        i++
        start = now
      }
    ).pipe(
      Effect.repeat(
        schedule.pipe(Schedule.intersect(Schedule.recurs(10)))
      ),
      Effect.fork
    )
    yield* TestClock.adjust(Infinity)
    yield* Fiber.join(fiber)
  }).pipe(Effect.provide(TestContext.TestContext), Effect.runPromise)
}

const schedule = Schedule.modifyDelay(
  Schedule.spaced("1 second"),
  (_) => "100 millis"
)

const action = Effect.void

log(action, schedule)
/*
Output:
delay: 0
#1 delay: 100 < modifyDelay
#2 delay: 100
#3 delay: 100
#4 delay: 100
#5 delay: 100
#6 delay: 100
#7 delay: 100
#8 delay: 100
#9 delay: 100
...
*/
```

## Tapping

Whenever we need to effectfully process each schedule input/output, we can use `Schedule.tapInput` and `Schedule.tapOutput`.

**Example** (Logging with tapOutput)

```ts twoslash collapse={10-41}
import {
  Effect,
  Schedule,
  TestClock,
  Fiber,
  TestContext,
  Console
} from "effect"

const log = <A, Out>(
  action: Effect.Effect<A>,
  schedule: Schedule.Schedule<Out, void>
): void => {
  let start = 0
  let i = 0

  Effect.gen(function* () {
    const fiber: Fiber.RuntimeFiber<[Out, number]> = yield* Effect.gen(
      function* () {
        yield* action
        const now = yield* TestClock.currentTimeMillis
        console.log(
          i === 0
            ? `delay: ${now - start}`
            : i === 10
            ? "..."
            : `#${i} delay: ${now - start}`
        )
        i++
        start = now
      }
    ).pipe(
      Effect.repeat(
        schedule.pipe(Schedule.intersect(Schedule.recurs(10)))
      ),
      Effect.fork
    )
    yield* TestClock.adjust(Infinity)
    yield* Fiber.join(fiber)
  }).pipe(Effect.provide(TestContext.TestContext), Effect.runPromise)
}

const schedule = Schedule.tapOutput(Schedule.recurs(2), (n) =>
  Console.log(`repeating ${n}`)
)

const action = Effect.void

log(action, schedule)
/*
Output:
delay: 0
repeating 0
#1 delay: 0
repeating 1
#2 delay: 0
repeating 2
*/
```
