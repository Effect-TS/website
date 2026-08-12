---
title: Error Channel Operations
description: Transform, filter, inspect, expose, and flip Effect error channels.
sidebar:
  order: 9
---

Error-channel operators change or observe an Effect's failure behavior without requiring an immediate recovery.

## Transforming Channels

### mapError

`Effect.mapError` transforms a typed error while leaving the success value unchanged.

**Example** (Mapping an Error)

```ts twoslash import.meta.vitest name="mapping-an-error-1"
import { Effect } from "effect"

const program = Effect.fail("unavailable").pipe(
  Effect.mapError((message) => new Error(message)),
)

const error = Effect.runSync(Effect.flip(program))

error.message // => "unavailable"
```

### mapBoth

`Effect.mapBoth` transforms the success and error channels in one operation.

```ts twoslash import.meta.vitest name="mapping-both-channels-1"
import { Effect } from "effect"

const program = Effect.succeed(2).pipe(
  Effect.mapBoth({
    onFailure: (message: string) => new Error(message),
    onSuccess: (value) => value * 2,
  }),
)

Effect.runSync(program) // => 4
```

The eager variants `mapErrorEager` and `mapBothEager` are optimizations for mappings that can be evaluated immediately.

## Filtering the Success Channel

`Effect.filterOrFail` keeps a success value when it satisfies a predicate and otherwise creates a typed failure.

**Example** (Validating a Success Value)

```ts twoslash import.meta.vitest name="validating-a-success-value-1"
import { Effect, Exit } from "effect"

const program = Effect.succeed(-1).pipe(
  Effect.filterOrFail(
    (value) => value >= 0,
    (value) => `Expected a non-negative number, got ${value}`,
  ),
)

Effect.runSyncExit(program) // => Exit.fail("Expected a non-negative number, got -1")
```

A user-defined type guard narrows the success type.

```ts twoslash import.meta.vitest name="narrowing-a-success-value-1"
import { Effect } from "effect"

interface User {
  readonly name: string
}

const user: Effect.Effect<User | null> = Effect.succeed({ name: "Alice" })

const name = user.pipe(
  Effect.filterOrFail(
    (value): value is User => value !== null,
    () => new Error("Unauthorized"),
  ),
  Effect.map((value) => value.name),
)

Effect.runSync(name) // => "Alice"
```

Use `Effect.filterOrElse` when a failed predicate should run another Effect instead of producing a value directly.

## Inspecting Failures

Tap operators run an observation Effect and preserve the original outcome. If the observation itself fails, that new failure is composed with the original outcome.

### tapError

`Effect.tapError` observes every typed error.

```ts twoslash import.meta.vitest name="tapping-a-typed-error-1"
import { Effect, Exit } from "effect"

const observed: Array<string> = []
const program = Effect.fail("NetworkError").pipe(
  Effect.tapError((error) =>
    Effect.sync(() => {
      observed.push(error)
    }),
  ),
)

Effect.runSyncExit(program) // => Exit.fail("NetworkError")
observed // => ["NetworkError"]
```

### tapErrorTag

`Effect.tapErrorTag` observes only one member of a tagged error union without handling it.

```ts twoslash import.meta.vitest name="tapping-a-tagged-error-1"
import { Data, Effect, Exit } from "effect"

class NetworkError extends Data.TaggedError("NetworkError")<{
  readonly status: number
}> {}

const observed: Array<number> = []
const error = new NetworkError({ status: 503 })
const program = Effect.fail(error).pipe(
  Effect.tapErrorTag("NetworkError", (error) =>
    Effect.sync(() => {
      observed.push(error.status)
    }),
  ),
)

Effect.runSyncExit(program) // => Exit.fail(error)
observed // => [503]
```

### tapCause

`Effect.tapCause` observes the complete `Cause`, including typed failures, defects, interruptions, and multiple reasons.

```ts twoslash import.meta.vitest name="tapping-a-cause-1"
import { Effect, Exit } from "effect"

const observed: Array<ReadonlyArray<string>> = []
const program = Effect.die("boom").pipe(
  Effect.tapCause((cause) =>
    Effect.sync(() => {
      observed.push(cause.reasons.map((reason) => reason._tag))
    }),
  ),
)

Effect.runSyncExit(program) // => Exit.die("boom")
observed // => [["Die"]]
```

### tapDefect

`Effect.tapDefect` observes defects only. It does not run for ordinary typed failures.

```ts twoslash import.meta.vitest name="tapping-a-defect-1"
import { Effect } from "effect"

const observed: Array<unknown> = []
const program = Effect.die("boom").pipe(
  Effect.tapDefect((defect) =>
    Effect.sync(() => {
      observed.push(defect)
    }),
  ),
  Effect.ignoreCause,
)

Effect.runSync(program) // => undefined
observed // => ["boom"]
```

Use an ordinary `Effect.tap` after `tapError` when both successful values and typed failures need separate observations.

## Moving Failures into the Success Channel

`Effect.result` exposes typed failures as `Result.Failure` values and `Effect.exit` exposes the complete outcome, including the full `Cause`.

```text showLineNumbers=false
Effect<A, E, R> -> Effect<Result<A, E>, never, R>
Effect<A, E, R> -> Effect<Exit<A, E>, never, R>
```

See [Expected Errors](/docs/v4/error-management/expected-errors/#result) for `Effect.result` and [Unexpected Errors](/docs/v4/error-management/unexpected-errors/#inspecting-the-complete-exit) for `Effect.exit`.

When both a typed error and success should become the same success type, recover with `Effect.catch`:

```ts twoslash import.meta.vitest name="merging-typed-errors-into-success-1"
import { Effect } from "effect"

const program: Effect.Effect<number, number> = Effect.fail(1)
const merged = program.pipe(Effect.catch(Effect.succeed))

Effect.runSync(merged) // => 1
```

## Flipping the Channels

`Effect.flip` swaps the typed error and success channels.

```ts twoslash import.meta.vitest name="flipping-effect-channels-1"
import { Effect } from "effect"

const program = Effect.fail("unavailable").pipe(Effect.as(42))
const flipped = Effect.flip(program)

Effect.runSync(flipped) // => "unavailable"
```

`flip` is useful for focused transformations of an error channel, but `mapError` or a catch operator usually communicates the intent more directly.
