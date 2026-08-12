---
title: Timing Out
description: Limit how long an Effect may run and customize the timeout outcome.
sidebar:
  order: 6
---

Timeout operators race an Effect against a duration. If the timeout wins, the source Effect is interrupted before the timeout outcome is produced.

## timeout

`Effect.timeout` represents a timeout as a typed `Cause.TimeoutError`.

**Example** (Failing with TimeoutError)

```ts twoslash import.meta.vitest name="failing-with-timeout-error-1"
import { Effect } from "effect"

const program = Effect.never.pipe(Effect.timeout(0))
const error = await Effect.runPromise(Effect.flip(program))

error._tag // => "TimeoutError"
```

If the source fails before the timeout, its original error is preserved. If it succeeds in time, its success value is returned unchanged.

```ts twoslash import.meta.vitest name="completing-before-a-timeout-1"
import { Effect } from "effect"

const program = Effect.succeed("result").pipe(Effect.timeout("1 second"))

Effect.runSync(program) // => "result"
```

## timeoutOption

`Effect.timeoutOption` represents only the timeout case as `Option.none()`. A timely success becomes `Option.some(value)`, while a typed failure from the source remains in the error channel.

**Example** (Returning None on Timeout)

```ts twoslash import.meta.vitest name="returning-none-on-timeout-1"
import { Effect, Option } from "effect"

const timedOut = await Effect.runPromise(
  Effect.never.pipe(Effect.timeoutOption(0)),
)

timedOut // => Option.none()

const completed = Effect.runSync(
  Effect.succeed("result").pipe(Effect.timeoutOption("1 second")),
)

completed // => Option.some("result")
```

Use this operator only when a timeout genuinely means absence. It does not discard ordinary failures from the source Effect.

## timeoutOrElse

`Effect.timeoutOrElse` switches to a lazily constructed fallback Effect when the timeout wins. The fallback may introduce its own success, error, and requirement types.

**Example** (Using Cached Data on Timeout)

```ts twoslash import.meta.vitest name="using-cached-data-on-timeout-1"
import { Effect } from "effect"

const program = Effect.never.pipe(
  Effect.timeoutOrElse({
    duration: 0,
    orElse: () => Effect.succeed("cached result"),
  }),
)

await Effect.runPromise(program) // => "cached result"
```

### Producing a Custom Error

Return `Effect.fail` from the fallback when the timeout should use a domain-specific error.

```ts twoslash import.meta.vitest name="producing-a-custom-timeout-error-1"
import { Data, Effect, Exit } from "effect"

class RequestTimeout extends Data.TaggedError("RequestTimeout")<{
  readonly endpoint: string
}> {}

const program = Effect.never.pipe(
  Effect.timeoutOrElse({
    duration: 0,
    orElse: () => Effect.fail(new RequestTimeout({ endpoint: "/users" })),
  }),
)

await Effect.runPromiseExit(program) // => Exit.fail(new RequestTimeout({ endpoint: "/users" }))
```

Returning `Effect.die` or `Effect.failCause(Cause.die(...))` from the fallback instead makes the timeout a defect. This should be reserved for situations where timing out violates an invariant.

## Interruption and Uninterruptible Work

The timeout fiber interrupts the source when the duration expires. Most Effects respond immediately. An uninterruptible region defers that interruption until it becomes interruptible again, so the caller may wait longer than the configured duration.

If work is intentionally allowed to outlive the caller, model that lifecycle explicitly by forking it into an appropriately supervised or detached fiber. Do not use detachment merely to make a timeout return early: detached work continues consuming resources after the caller has moved on.
