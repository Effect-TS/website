---
title: Error Accumulation
description: Accumulate every typed error or preserve both failures and successes.
sidebar:
  order: 8
---

Combinators such as `Effect.all` and `Effect.forEach` fail fast by default. Validation often needs different behavior: evaluate every input and report all problems together.

## validate

`Effect.validate` applies an effectful function to every element. If all elements succeed, it returns all success values. If any fail, it returns every error as a non-empty array and discards the successes.

**Example** (Collecting Validation Errors)

```ts twoslash import.meta.vitest name="collecting-validation-errors-1"
import { Effect, Exit } from "effect"

const program = Effect.validate([1, 2, 3, 4], (value) =>
  value % 2 === 0 ? Effect.succeed(value) : Effect.fail(`${value} is not even`),
)

Effect.runSyncExit(program) // => Exit.fail(["1 is not even", "3 is not even"])
```

Every element is evaluated. Use `{ concurrency }` to control parallelism and `{ discard: true }` when only validation, not the success values, is needed.

## partition

`Effect.partition` also evaluates every element, but never fails. It returns `[failures, successes]`, preserving both sides.

**Example** (Partitioning Failures and Successes)

```ts twoslash import.meta.vitest name="partitioning-failures-and-successes-1"
import { Effect } from "effect"

const program = Effect.partition([0, 1, 2, 3, 4], (value) =>
  value % 2 === 0 ? Effect.succeed(value) : Effect.fail(`${value} is not even`),
)

Effect.runSync(program) // => [["1 is not even", "3 is not even"], [0, 2, 4]]
```

Like `validate`, `partition` accepts a `concurrency` option.
