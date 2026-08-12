---
title: Matching
description: Handle success and failure outcomes with pure or effectful handlers.
sidebar:
  order: 4
---

Matching consumes both channels of an Effect and produces one result. Use the ordinary variants for typed failures and the `Cause` variants when defects and interruptions must also be considered.

## match

`Effect.match` handles a typed failure or success with pure functions. Defects and interruptions are not handled.

**Example** (Matching Both Channels)

```ts twoslash import.meta.vitest name="matching-both-channels-1"
import { Effect } from "effect"

const task: Effect.Effect<number, string> = Effect.fail("unavailable")

const program = Effect.match(task, {
  onFailure: (error) => `failure: ${error}`,
  onSuccess: (value) => `success: ${value}`,
})

Effect.runSync(program) // => "failure: unavailable"
```

## matchEffect

`Effect.matchEffect` is the effectful version: both handlers return Effects and may introduce new errors or requirements.

**Example** (Running an Effectful Handler)

```ts twoslash import.meta.vitest name="matching-with-effects-1"
import { Effect } from "effect"

const task: Effect.Effect<number, string> = Effect.succeed(42)

const program = Effect.matchEffect(task, {
  onFailure: (error) => Effect.succeed(`failure: ${error}`),
  onSuccess: (value) => Effect.succeed(`success: ${value}`),
})

Effect.runSync(program) // => "success: 42"
```

## matchCause and matchCauseEffect

`Effect.matchCause` passes the complete `Cause` to `onFailure`, so it also handles defects and interruptions. `Effect.matchCauseEffect` is its effectful counterpart.

**Example** (Matching a Defect)

```ts twoslash import.meta.vitest name="matching-a-defect-1"
import { Cause, Effect } from "effect"

const program = Effect.die("boom").pipe(
  Effect.matchCause({
    onFailure: (cause) =>
      Cause.hasDies(cause) ? "terminated by a defect" : "failed",
    onSuccess: () => "succeeded",
  }),
)

Effect.runSync(program) // => "terminated by a defect"
```

## ignore and ignoreCause

`Effect.ignore` discards the success value and recovers from typed errors, producing `Effect<void, never, R>`. Defects and interruptions are preserved.

`Effect.ignoreCause` also discards every failure cause. Use it sparingly because it can hide defects.

```ts twoslash import.meta.vitest name="ignoring-errors-1"
import { Effect, Exit } from "effect"

Effect.runSync(Effect.ignore(Effect.fail("error"))) // => undefined

const defect = Effect.ignore(Effect.die("boom"))
Effect.runSyncExit(defect) // => Exit.die("boom")

Effect.runSync(Effect.ignoreCause(Effect.die("boom"))) // => undefined
```
