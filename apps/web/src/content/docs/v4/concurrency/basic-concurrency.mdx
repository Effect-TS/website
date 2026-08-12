---
title: Basic Concurrency
description: Manage and control effect execution with concurrency, interruptions, and racing.
sidebar:
  order: 0
---

import { Aside } from "@astrojs/starlight/components"

## Concurrency Options

Effect provides options to manage how effects are executed, particularly focusing on controlling how many effects run concurrently.

```ts showLineNumbers=false
type Options = {
  readonly concurrency?: Concurrency
}
```

The `concurrency` option is used to determine the level of concurrency, with the following values:

```ts showLineNumbers=false
type Concurrency = number | "unbounded"
```

Let's explore each configuration in detail.

<Aside type="tip" title="Applicability of Concurrency Options">
  The examples here use the `Effect.all` function, but these options apply to
  many other Effect APIs.
</Aside>

### Sequential Execution (Default)

By default, if you don't specify any concurrency option, effects will run sequentially, one after the other. This means each effect starts only after the previous one completes.

**Example** (Sequential Execution)

```ts twoslash import.meta.vitest name="sequential-execution-default-1"
import { Effect, Duration } from "effect"

// Helper function to simulate a task with a delay
const makeTask = (n: number, delay: Duration.Input) =>
  Effect.promise(
    () =>
      new Promise<void>((resolve) => {
        console.log(`start task${n}`) // Logs when the task starts
        setTimeout(() => {
          console.log(`task${n} done`) // Logs when the task finishes
          resolve()
        }, Duration.toMillis(delay))
      }),
  )

const task1 = makeTask(1, "200 millis")
const task2 = makeTask(2, "100 millis")

const sequential = Effect.all([task1, task2])

await Effect.runPromise(sequential) // => [undefined, undefined]
/*
Output:
start task1
task1 done
start task2 <-- task2 starts only after task1 completes
task2 done
*/
```

### Numbered Concurrency

You can control how many effects run concurrently by setting a `number` for `concurrency`. For example, `concurrency: 2` allows up to two effects to run at the same time.

**Example** (Limiting to 2 Concurrent Tasks)

```ts twoslash import.meta.vitest name="numbered-concurrency-1"
import { Effect, Duration } from "effect"

// Helper function to simulate a task with a delay
const makeTask = (n: number, delay: Duration.Input) =>
  Effect.promise(
    () =>
      new Promise<void>((resolve) => {
        console.log(`start task${n}`) // Logs when the task starts
        setTimeout(() => {
          console.log(`task${n} done`) // Logs when the task finishes
          resolve()
        }, Duration.toMillis(delay))
      }),
  )

const task1 = makeTask(1, "200 millis")
const task2 = makeTask(2, "100 millis")
const task3 = makeTask(3, "210 millis")
const task4 = makeTask(4, "110 millis")
const task5 = makeTask(5, "150 millis")

const numbered = Effect.all([task1, task2, task3, task4, task5], {
  concurrency: 2,
})

await Effect.runPromise(numbered) // => [undefined, undefined, undefined, undefined, undefined]
/*
Output:
start task1
start task2 <-- active tasks: task1, task2
task2 done
start task3 <-- active tasks: task1, task3
task1 done
start task4 <-- active tasks: task3, task4
task4 done
start task5 <-- active tasks: task3, task5
task3 done
task5 done
*/
```

### Unbounded Concurrency

When `concurrency: "unbounded"` is used, there's no limit to the number of effects running concurrently.

**Example** (Unbounded Concurrency)

```ts twoslash import.meta.vitest name="unbounded-concurrency-1"
import { Effect, Duration } from "effect"

// Helper function to simulate a task with a delay
const makeTask = (n: number, delay: Duration.Input) =>
  Effect.promise(
    () =>
      new Promise<void>((resolve) => {
        console.log(`start task${n}`) // Logs when the task starts
        setTimeout(() => {
          console.log(`task${n} done`) // Logs when the task finishes
          resolve()
        }, Duration.toMillis(delay))
      }),
  )

const task1 = makeTask(1, "200 millis")
const task2 = makeTask(2, "100 millis")
const task3 = makeTask(3, "210 millis")
const task4 = makeTask(4, "110 millis")
const task5 = makeTask(5, "150 millis")

const unbounded = Effect.all([task1, task2, task3, task4, task5], {
  concurrency: "unbounded",
})

await Effect.runPromise(unbounded) // => [undefined, undefined, undefined, undefined, undefined]
/*
Output:
start task1
start task2
start task3
start task4
start task5
task2 done
task4 done
task5 done
task1 done
task3 done
*/
```

## Interruptions

All effects in Effect are executed by [fibers](/docs/v4/concurrency/fibers/). If you didn't create the fiber yourself, it was created by an operation you're using (if it's concurrent) or by the Effect [runtime](/docs/v4/runtime/) system.

A fiber is created any time an effect is run. When running effects concurrently, a fiber is created for each concurrent effect.

To summarize:

- An `Effect` is a higher-level concept that describes an effectful computation. It is lazy and immutable, meaning it represents a computation that may produce a value or fail but does not immediately execute.
- A fiber, on the other hand, represents the running execution of an `Effect`. It can be interrupted or awaited to retrieve its result. Think of it as a way to control and interact with the ongoing computation.

Fibers can be interrupted in various ways. Let's explore some of these scenarios and see examples of how to interrupt fibers in Effect.

### interrupt

A fiber can be interrupted using the `Effect.interrupt` effect on that particular fiber.

This effect models the explicit interruption of the fiber in which it runs.
When executed, it causes the fiber to stop its operation immediately, capturing the interruption details such as the fiber's ID and its start time.
The resulting interruption can be observed in the [Exit](/docs/v4/data-types/exit/) type if the effect is run with functions like [runPromiseExit](/docs/v4/getting-started/running-effects/#runpromiseexit).

**Example** (Without Interruption)

In this case, the program runs without any interruption, logging the start and completion of the task.

```ts twoslash import.meta.vitest name="interrupt-1"
import { Effect, Exit } from "effect"

const program = Effect.gen(function* () {
  console.log("start")
  yield* Effect.sleep("2 seconds")
  console.log("done")
  return "some result"
})

await Effect.runPromiseExit(program) // => Exit.succeed("some result")
/*
Output:
start
done
*/
```

**Example** (With Interruption)

Here, the fiber is interrupted after the log `"start"` but before the `"done"` log. The `Effect.interrupt` stops the fiber, and it never reaches the final log.

```ts {6} twoslash import.meta.vitest name="interrupt-2"
import { Effect } from "effect"

const program = Effect.gen(function* () {
  console.log("start")
  yield* Effect.sleep("2 seconds")
  return yield* Effect.interrupt
})

const exit = await Effect.runPromiseExit(program)
exit._tag // => "Failure"
/*
Output:
start
{
  _id: 'Exit',
  _tag: 'Failure',
  cause: {
    _id: 'Cause',
    _tag: 'Interrupt',
    fiberId: {
      _id: 'FiberId',
      _tag: 'Runtime',
      id: 0,
      startTimeMillis: ...
    }
  }
}
*/
```

### onInterrupt

Registers a cleanup effect to run when an effect is interrupted.

This function allows you to specify an effect to run when the fiber is interrupted. This effect will be executed
when the fiber is interrupted, allowing you to perform cleanup or other actions.

**Example** (Running a Cleanup Action on Interruption)

In this example, we set up a handler that logs "Cleanup completed" whenever the fiber is interrupted. We then show three cases: a successful effect, a failing effect, and an interrupted effect, demonstrating how the handler is triggered depending on how the effect ends.

```ts twoslash import.meta.vitest name="oninterrupt-1"
import { Console, Effect, Exit } from "effect"

// This handler is executed when the fiber is interrupted
const handler = Effect.onInterrupt((_fibers) =>
  Console.log("Cleanup completed"),
)

const success = Console.log("Task completed").pipe(
  Effect.as("some result"),
  handler,
)

await Effect.runPromise(success) // => "some result"
/*
Output:
Task completed
*/

const failure = Console.log("Task failed").pipe(
  Effect.andThen(Effect.fail("some error")),
  handler,
)

await Effect.runPromiseExit(failure) // => Exit.fail("some error")
/*
Output:
Task failed
*/

const interruption = Console.log("Task interrupted").pipe(
  Effect.andThen(Effect.interrupt),
  handler,
)

const interruptionExit = await Effect.runPromiseExit(interruption)
interruptionExit._tag // => "Failure"
/*
Output:
Task interrupted
Cleanup completed
*/
```

### Interruption of Concurrent Effects

When running multiple effects concurrently, such as with `Effect.forEach`, if one of the effects is interrupted, it causes all concurrent effects to be interrupted as well.

The resulting [cause](/docs/v4/data-types/cause/) includes information about which fibers were interrupted.

**Example** (Interrupting Concurrent Effects)

```ts twoslash import.meta.vitest name="interruption-of-concurrent-effects-1"
import { Effect, Console } from "effect"

const program = Effect.forEach(
  [1, 2, 3],
  (n) =>
    Effect.gen(function* () {
      console.log(`start #${n}`)
      yield* Effect.sleep(`${n} seconds`)
      if (n > 1) {
        return yield* Effect.interrupt
      }
      console.log(`done #${n}`)
    }).pipe(Effect.onInterrupt(() => Console.log(`interrupted #${n}`))),
  { concurrency: "unbounded" },
)

const exit = await Effect.runPromiseExit(program)
console.log(JSON.stringify(exit, null, 2))
exit._tag // => "Failure"
/*
Output:
start #1
start #2
start #3
done #1
interrupted #2
interrupted #3
{
  "_id": "Exit",
  "_tag": "Failure",
  "cause": {
    "_id": "Cause",
    "_tag": "Parallel",
    "left": {
      "_id": "Cause",
      "_tag": "Interrupt",
      "fiberId": {
        "_id": "FiberId",
        "_tag": "Runtime",
        "id": 3,
        "startTimeMillis": ...
      }
    },
    "right": {
      "_id": "Cause",
      "_tag": "Sequential",
      "left": {
        "_id": "Cause",
        "_tag": "Empty"
      },
      "right": {
        "_id": "Cause",
        "_tag": "Interrupt",
        "fiberId": {
          "_id": "FiberId",
          "_tag": "Runtime",
          "id": 0,
          "startTimeMillis": ...
        }
      }
    }
  }
}
*/
```

## Racing

### race

This function takes two effects and runs them concurrently. The first effect
that successfully completes will determine the result of the race, and the
other effect will be interrupted.

If neither effect succeeds, the function will fail with a [cause](/docs/v4/data-types/cause/) containing all the errors.

This is useful when you want to run two effects concurrently, but only care
about the first one to succeed. It is commonly used in cases like timeouts,
retries, or when you want to optimize for the faster response without
worrying about the other effect.

**Example** (Both Tasks Succeed)

```ts twoslash import.meta.vitest name="race-1"
import { Effect, Console } from "effect"

const task1 = Effect.succeed("task1").pipe(
  Effect.delay("200 millis"),
  Effect.tap(Console.log("task1 done")),
  Effect.onInterrupt(() => Console.log("task1 interrupted")),
)
const task2 = Effect.succeed("task2").pipe(
  Effect.delay("100 millis"),
  Effect.tap(Console.log("task2 done")),
  Effect.onInterrupt(() => Console.log("task2 interrupted")),
)

const program = Effect.race(task1, task2)

await Effect.runPromise(program) // => "task2"
/*
Output:
task2 done
task1 interrupted
*/
```

**Example** (One Task Fails, One Succeeds)

```ts twoslash import.meta.vitest name="race-2"
import { Effect, Console } from "effect"

const task1 = Effect.fail("task1").pipe(
  Effect.delay("100 millis"),
  Effect.tap(Console.log("task1 done")),
  Effect.onInterrupt(() => Console.log("task1 interrupted")),
)
const task2 = Effect.succeed("task2").pipe(
  Effect.delay("200 millis"),
  Effect.tap(Console.log("task2 done")),
  Effect.onInterrupt(() => Console.log("task2 interrupted")),
)

const program = Effect.race(task1, task2)

await Effect.runPromise(program) // => "task2"
/*
Output:
task2 done
*/
```

**Example** (Both Tasks Fail)

```ts twoslash import.meta.vitest name="race-3"
import { Effect, Console } from "effect"

const task1 = Effect.fail("task1").pipe(
  Effect.delay("100 millis"),
  Effect.tap(Console.log("task1 done")),
  Effect.onInterrupt(() => Console.log("task1 interrupted")),
)
const task2 = Effect.fail("task2").pipe(
  Effect.delay("200 millis"),
  Effect.tap(Console.log("task2 done")),
  Effect.onInterrupt(() => Console.log("task2 interrupted")),
)

const program = Effect.race(task1, task2)

const exit = await Effect.runPromiseExit(program)
console.log(exit)
exit._tag // => "Failure"
/*
Output:
{
  _id: 'Exit',
  _tag: 'Failure',
  cause: {
    _id: 'Cause',
    _tag: 'Parallel',
    left: { _id: 'Cause', _tag: 'Fail', failure: 'task1' },
    right: { _id: 'Cause', _tag: 'Fail', failure: 'task2' }
  }
}
*/
```

If you want to handle the result of whichever task completes first, whether it succeeds or fails, you can use the `Effect.result` function. This function wraps the result in a [Result](/docs/v4/data-types/result/) type, allowing you to see if the result was a success (`Success`) or a failure (`Failure`):

**Example** (Handling Success or Failure with Result)

```ts twoslash import.meta.vitest name="race-4"
import { Effect, Console, Result } from "effect"

const task1 = Effect.fail("task1").pipe(
  Effect.delay("100 millis"),
  Effect.tap(Console.log("task1 done")),
  Effect.onInterrupt(() => Console.log("task1 interrupted")),
)
const task2 = Effect.succeed("task2").pipe(
  Effect.delay("200 millis"),
  Effect.tap(Console.log("task2 done")),
  Effect.onInterrupt(() => Console.log("task2 interrupted")),
)

// Run both tasks concurrently, wrapping the result
// in Result to capture success or failure
const program = Effect.race(Effect.result(task1), Effect.result(task2))

await Effect.runPromise(program) // => Result.fail("task1")
/*
Output:
task2 interrupted
{ _id: 'Result', _tag: 'Failure', failure: 'task1' }
*/
```

### raceAll

This function runs multiple effects concurrently and returns the result of the first one to succeed. If one effect succeeds, the others will be interrupted.

If none of the effects succeed, the function will fail with the last error encountered.

This is useful when you want to race multiple effects, but only care
about the first one to succeed. It is commonly used in cases like timeouts,
retries, or when you want to optimize for the faster response without
worrying about the other effects.

**Example** (All Tasks Succeed)

```ts twoslash import.meta.vitest name="raceall-1"
import { Effect, Console } from "effect"

const task1 = Effect.succeed("task1").pipe(
  Effect.delay("100 millis"),
  Effect.tap(Console.log("task1 done")),
  Effect.onInterrupt(() => Console.log("task1 interrupted")),
)
const task2 = Effect.succeed("task2").pipe(
  Effect.delay("200 millis"),
  Effect.tap(Console.log("task2 done")),
  Effect.onInterrupt(() => Console.log("task2 interrupted")),
)

const task3 = Effect.succeed("task3").pipe(
  Effect.delay("150 millis"),
  Effect.tap(Console.log("task3 done")),
  Effect.onInterrupt(() => Console.log("task3 interrupted")),
)

const program = Effect.raceAll([task1, task2, task3])

await Effect.runPromise(program) // => "task1"
/*
Output:
task1 done
task2 interrupted
task3 interrupted
*/
```

**Example** (One Task Fails, Two Tasks Succeed)

```ts twoslash import.meta.vitest name="raceall-2"
import { Effect, Console } from "effect"

const task1 = Effect.fail("task1").pipe(
  Effect.delay("100 millis"),
  Effect.tap(Console.log("task1 done")),
  Effect.onInterrupt(() => Console.log("task1 interrupted")),
)
const task2 = Effect.succeed("task2").pipe(
  Effect.delay("200 millis"),
  Effect.tap(Console.log("task2 done")),
  Effect.onInterrupt(() => Console.log("task2 interrupted")),
)

const task3 = Effect.succeed("task3").pipe(
  Effect.delay("150 millis"),
  Effect.tap(Console.log("task3 done")),
  Effect.onInterrupt(() => Console.log("task3 interrupted")),
)

const program = Effect.raceAll([task1, task2, task3])

await Effect.runPromise(program) // => "task3"
/*
Output:
task3 done
task2 interrupted
*/
```

**Example** (All Tasks Fail)

```ts twoslash import.meta.vitest name="raceall-3"
import { Effect, Console } from "effect"

const task1 = Effect.fail("task1").pipe(
  Effect.delay("100 millis"),
  Effect.tap(Console.log("task1 done")),
  Effect.onInterrupt(() => Console.log("task1 interrupted")),
)
const task2 = Effect.fail("task2").pipe(
  Effect.delay("200 millis"),
  Effect.tap(Console.log("task2 done")),
  Effect.onInterrupt(() => Console.log("task2 interrupted")),
)

const task3 = Effect.fail("task3").pipe(
  Effect.delay("150 millis"),
  Effect.tap(Console.log("task3 done")),
  Effect.onInterrupt(() => Console.log("task3 interrupted")),
)

const program = Effect.raceAll([task1, task2, task3])

const exit = await Effect.runPromiseExit(program)
console.log(exit)
exit._tag // => "Failure"
/*
Output:
{
  _id: 'Exit',
  _tag: 'Failure',
  cause: { _id: 'Cause', _tag: 'Fail', failure: 'task2' }
}
*/
```

### raceFirst

This function takes two effects and runs them concurrently, returning the
result of the first one that completes, regardless of whether it succeeds or
fails.

This function is useful when you want to race two operations, and you want to
proceed with whichever one finishes first, regardless of whether it succeeds
or fails.

**Example** (Both Tasks Succeed)

```ts twoslash import.meta.vitest name="racefirst-1"
import { Effect, Console, Exit } from "effect"

const task1 = Effect.succeed("task1").pipe(
  Effect.delay("100 millis"),
  Effect.tap(Console.log("task1 done")),
  Effect.onInterrupt(() =>
    Console.log("task1 interrupted").pipe(Effect.delay("100 millis")),
  ),
)
const task2 = Effect.succeed("task2").pipe(
  Effect.delay("200 millis"),
  Effect.tap(Console.log("task2 done")),
  Effect.onInterrupt(() =>
    Console.log("task2 interrupted").pipe(Effect.delay("100 millis")),
  ),
)

const program = Effect.raceFirst(task1, task2).pipe(
  Effect.tap(Console.log("more work...")),
)

await Effect.runPromiseExit(program) // => Exit.succeed("task1")
/*
Output:
task1 done
task2 interrupted
more work...
*/
```

**Example** (One Task Fails, One Succeeds)

```ts twoslash import.meta.vitest name="racefirst-2"
import { Effect, Console, Exit } from "effect"

const task1 = Effect.fail("task1").pipe(
  Effect.delay("100 millis"),
  Effect.tap(Console.log("task1 done")),
  Effect.onInterrupt(() =>
    Console.log("task1 interrupted").pipe(Effect.delay("100 millis")),
  ),
)
const task2 = Effect.succeed("task2").pipe(
  Effect.delay("200 millis"),
  Effect.tap(Console.log("task2 done")),
  Effect.onInterrupt(() =>
    Console.log("task2 interrupted").pipe(Effect.delay("100 millis")),
  ),
)

const program = Effect.raceFirst(task1, task2).pipe(
  Effect.tap(Console.log("more work...")),
)

await Effect.runPromiseExit(program) // => Exit.fail("task1")
/*
Output:
task2 interrupted
*/
```

#### Observing the Winner

The optional `onWinner` callback receives the winning fiber and its index (`0` for the first effect, `1` for the second). The callback is observational: the result of `raceFirst` is still determined by the first effect to complete.

**Example** (Observing Which Task Completes First)

```ts twoslash
import { Effect, Console } from "effect"

const task1 = Effect.succeed("task1").pipe(
  Effect.delay("100 millis"),
  Effect.tap(Console.log("task1 done")),
  Effect.onInterrupt(() =>
    Console.log("task1 interrupted").pipe(Effect.delay("100 millis")),
  ),
)
const task2 = Effect.succeed("task2").pipe(
  Effect.delay("200 millis"),
  Effect.tap(Console.log("task2 done")),
  Effect.onInterrupt(() =>
    Console.log("task2 interrupted").pipe(Effect.delay("100 millis")),
  ),
)

const program = Effect.raceFirst(task1, task2, {
  onWinner: ({ index }) => console.log(`task${index + 1} won`),
})

Effect.runFork(program)
/*
Output:
task1 done
task1 won
task2 interrupted
*/
```
