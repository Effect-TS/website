---
title: Parallel and Sequential Errors
description: Understand how Effect represents multiple failure reasons in Cause.
sidebar:
  order: 10
---

Most Effect combinators fail fast: once an effect fails, later work is not started and concurrent work is interrupted. Some operations can nevertheless produce several failure reasons, for example when concurrent fibers fail together or when both an operation and its finalizer fail.

## Flat Causes

`Cause<E>` contains a flat readonly array of `Reason<E>` values:

```ts showLineNumbers=false
type Reason<E> = Cause.Fail<E> | Cause.Die | Cause.Interrupt
```

Reasons combined sequentially and reasons combined in parallel use the same `reasons` array representation.

**Example** (Inspecting Multiple Reasons)

```ts twoslash import.meta.vitest name="inspecting-multiple-reasons-1"
import { Cause } from "effect"

const cause = Cause.combine(
  Cause.fail("request failed"),
  Cause.die(new Error("finalizer failed")),
)

cause.reasons.map((reason) => reason._tag) // => ["Fail", "Die"]
```

Use `Cause.hasFails`, `Cause.hasDies`, and `Cause.hasInterrupts` when only the kind of failure matters. Use `cause.reasons` or extractors such as `Cause.findError` and `Cause.findDefect` when the individual values are needed.

## Accumulating Domain Errors

Multiple typed validation errors are usually better represented as data rather than as multiple `Cause` reasons. Use [`Effect.validate`](/docs/v4/error-management/error-accumulation/#validate) to collect every typed error, or [`Effect.partition`](/docs/v4/error-management/error-accumulation/#partition) to preserve both failures and successes.
