---
title: Fallback
description: Recover from typed failures with fallback effects and values.
sidebar:
  order: 3
---

Fallback operators recover from typed failures. Defects and interruptions remain unchanged.

## catch

`Effect.catch` receives the error and returns a fallback Effect. If the source succeeds, the fallback is not evaluated.

**Example** (Recovering with Another Effect)

```ts twoslash import.meta.vitest name="recovering-with-another-effect-1"
import { Effect } from "effect"

const primary = Effect.fail("primary unavailable")

const program = primary.pipe(
  Effect.catch((error) => Effect.succeed(`fallback: ${error}`)),
)

Effect.runSync(program) // => "fallback: primary unavailable"
```

Use `Effect.catchTag`, `Effect.catchIf`, or `Effect.catchFilter` when only part of the error channel should trigger the fallback.

## orElseSucceed

`Effect.orElseSucceed` replaces any typed failure with a lazily evaluated success value and removes the typed error channel.

**Example** (Providing a Default Value)

```ts twoslash import.meta.vitest name="providing-a-fallback-value-1"
import { Effect } from "effect"

const program = Effect.fail("missing").pipe(Effect.orElseSucceed(() => 0))

Effect.runSync(program) // => 0
```

This operator handles every typed error. If only absence or one specific error should use the default, narrow the error first with a selective catch operator.

## firstSuccessOf

`Effect.firstSuccessOf` runs alternatives sequentially and stops at the first success. If every effect fails, it propagates the last error.

**Example** (Trying Prioritized Alternatives)

```ts twoslash import.meta.vitest name="trying-prioritized-alternatives-1"
import { Effect } from "effect"

const program = Effect.firstSuccessOf([
  Effect.fail("primary unavailable"),
  Effect.succeed("secondary result"),
  Effect.die("not evaluated"),
])

Effect.runSync(program) // => "secondary result"
```

Passing an empty iterable creates a defect with the message `"Received an empty collection of effects"`.
