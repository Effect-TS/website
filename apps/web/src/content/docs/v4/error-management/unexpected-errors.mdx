---
title: Unexpected Errors
description: Create, inspect, report, and selectively recover from defects.
sidebar:
  order: 2
---

Unexpected errors, or **defects**, indicate bugs, violated invariants, or failures outside the program's expected domain. They are retained in the runtime `Cause`, but do not appear in the typed error channel.

Defects normally should be reported and allowed to terminate the affected fiber. Recover from them only at boundaries where continuing is explicitly safe.

## Creating a Defect

`Effect.die(defect)` creates an Effect that terminates with the supplied defect. Its typed error channel is `never`.

**Example** (Terminating on an Impossible Input)

```ts twoslash import.meta.vitest name="creating-a-defect-1"
import { Effect, Exit } from "effect"

const divide = (a: number, b: number) =>
  b === 0
    ? Effect.die(new Error("Cannot divide by zero"))
    : Effect.succeed(a / b)

const exit = Effect.runSyncExit(divide(1, 0))

Exit.isFailure(exit) && exit.cause.reasons[0]?._tag // => "Die"
```

Pass a string or, preferably, an `Error` with a useful message to `Effect.die`.

Exceptions thrown while evaluating Effect callbacks such as `Effect.sync` are also represented as defects.

## Converting Typed Errors to Defects

`Effect.orDie` converts every typed failure into a defect and removes the typed error channel.

**Example** (Treating a Failure as Unrecoverable)

```ts twoslash import.meta.vitest name="converting-a-failure-to-a-defect-1"
import { Effect, Exit } from "effect"

const program = Effect.fail(new Error("Invalid startup configuration")).pipe(
  Effect.orDie,
)

const exit = Effect.runSyncExit(program)

Exit.isFailure(exit) && exit.cause.reasons[0]?._tag // => "Die"
```

To customize the defect, transform the typed error first with `Effect.mapError` and then apply `Effect.orDie`.

```ts twoslash import.meta.vitest name="customizing-a-converted-defect-1"
import { Cause, Effect, Exit, Predicate } from "effect"

const program = Effect.fail("missing token").pipe(
  Effect.mapError((message) => new Error(`Startup failed: ${message}`)),
  Effect.orDie,
)

const exit = Effect.runSyncExit(program)

const reason = Exit.isFailure(exit) ? exit.cause.reasons[0] : undefined
const message =
  reason !== undefined &&
  Cause.isDieReason(reason) &&
  Predicate.isError(reason.defect)
    ? reason.defect.message
    : undefined

message // => "Startup failed: missing token"
```

## Inspecting the Complete Exit

`Effect.exit` moves the complete outcome into the success channel:

```text showLineNumbers=false
Effect<A, E, R> -> Effect<Exit<A, E>, never, R>
```

Unlike `Effect.result`, an `Exit` preserves the complete `Cause`, including defects and interruptions.

**Example** (Inspecting a Defect with Exit)

```ts twoslash import.meta.vitest name="inspecting-a-defect-with-exit-1"
import { Cause, Effect, Exit } from "effect"

const exit = Effect.runSync(Effect.exit(Effect.die("boom")))

const hasDefect = Exit.isFailure(exit) && Cause.hasDies(exit.cause)

hasDefect // => true
```

This is useful at application boundaries, in tests, and when integrating with APIs that need an explicit value for every outcome.

## catchDefect

`Effect.catchDefect` handles defects only. Typed failures and interruptions are left unchanged.

**Example** (Recovering from a Defect)

```ts twoslash import.meta.vitest name="recovering-from-a-defect-1"
import { Effect, Predicate } from "effect"

const program = Effect.die(new Error("plugin crashed")).pipe(
  Effect.catchDefect((defect) =>
    Predicate.isError(defect)
      ? Effect.succeed(`disabled plugin: ${defect.message}`)
      : Effect.die(defect),
  ),
)

Effect.runSync(program) // => "disabled plugin: plugin crashed"
```

## catchCause

`Effect.catchCause` handles the complete `Cause`, including typed failures, defects, interruptions, and multiple reasons.

**Example** (Recovering Based on the Cause)

```ts twoslash import.meta.vitest name="recovering-based-on-the-cause-1"
import { Cause, Effect } from "effect"

const program = Effect.die("boom").pipe(
  Effect.catchCause((cause) =>
    Cause.hasDies(cause)
      ? Effect.succeed("recovered at the boundary")
      : Effect.failCause(cause),
  ),
)

Effect.runSync(program) // => "recovered at the boundary"
```

Prefer typed recovery operators such as `Effect.catch` and `Effect.catchTag` for domain errors. Use `catchDefect` or `catchCause` only where recovering from unexpected failures is intentional and safe.
