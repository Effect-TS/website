---
title: Sandboxing
description: Expose an Effect's complete Cause in its typed error channel.
sidebar:
  order: 7
---

`Effect.sandbox` exposes the complete failure `Cause` in the typed error channel:

```text showLineNumbers=false
Effect<A, E, R> -> Effect<A, Cause<E>, R>
```

Unlike an ordinary typed error, a `Cause<E>` can contain typed failures, defects, interruptions, or several reasons at once. Causes are flat: inspect the readonly `reasons` array and use the reason guards from the `Cause` module.

**Example** (Inspecting a Sandboxed Cause)

```ts twoslash import.meta.vitest name="inspecting-a-sandboxed-cause-1"
import { Cause, Effect } from "effect"

const sandboxed = Effect.fail("invalid input").pipe(Effect.sandbox)

const program = sandboxed.pipe(
  Effect.catch((cause) => {
    const failure = cause.reasons.find(Cause.isFailReason)
    return failure === undefined
      ? Effect.fail(cause)
      : Effect.succeed(`Recovered from: ${failure.error}`)
  }),
)

Effect.runSync(program) // => "Recovered from: invalid input"
```

When a sandboxed effect has not otherwise recovered, convert its error channel back to the original failure model with `Effect.catch(Effect.failCause)`:

```ts twoslash import.meta.vitest name="restoring-a-sandboxed-effect-1"
import { Effect, Exit } from "effect"

const sandboxed = Effect.fail("invalid input").pipe(Effect.sandbox)
const restored = sandboxed.pipe(Effect.catch(Effect.failCause))

Effect.runSyncExit(restored) // => Exit.fail("invalid input")
```

For one recovery step, `Effect.catchCause` is usually simpler because it provides the same `Cause` directly without changing the error type first.
