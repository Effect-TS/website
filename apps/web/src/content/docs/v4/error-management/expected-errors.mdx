---
title: Expected Errors
description: Create, track, expose, and recover from typed errors.
sidebar:
  order: 1
---

Expected errors are represented in the error channel of [`Effect`](/docs/v4/getting-started/the-effect-type/):

```text showLineNumbers=false "Error"
         ┌─── Success type
         │        ┌─── Error type
         │        │      ┌─── Requirements
         ▼        ▼      ▼
Effect<Success, Error, Requirements>
```

Because the error type is explicit, callers can see which failures are possible and decide which ones to recover from.

## Creating Expected Errors

`Effect.fail(error)` creates an Effect that fails with `error`. Use `Effect.failSync` when constructing the error should be deferred until the Effect runs.

**Example** (Creating a Typed Failure)

```ts twoslash import.meta.vitest name="creating-a-typed-failure-1"
import { Data, Effect } from "effect"

class UserNotFound extends Data.TaggedError("UserNotFound")<{
  readonly id: string
}> {}

const findUser = (id: string): Effect.Effect<string, UserNotFound> =>
  id === "1" ? Effect.succeed("Alice") : Effect.fail(new UserNotFound({ id }))

Effect.runSync(Effect.flip(findUser("2")))._tag // => "UserNotFound"
```

Errors built with `Data.Error` or `Data.TaggedError` are also yieldable directly inside `Effect.gen`. See [Yieldable Errors](/docs/v4/error-management/yieldable-errors/).

## Tracking Multiple Error Types

When effects with different error types are composed, Effect tracks their union.

```ts twoslash import.meta.vitest name="tracking-multiple-error-types-1"
import { Data, Effect } from "effect"

class InvalidInput extends Data.TaggedError("InvalidInput")<{}> {}
class UserNotFound extends Data.TaggedError("UserNotFound")<{}> {}

declare const validate: Effect.Effect<string, InvalidInput>
declare const loadUser: (id: string) => Effect.Effect<string, UserNotFound>

// Effect<string, InvalidInput | UserNotFound>
const program = Effect.gen(function* () {
  const id = yield* validate
  return yield* loadUser(id)
})
```

Sequential composition short-circuits on the first failure. Operations after the failure are not evaluated.

## Exposing Errors as Values

Sometimes the caller needs to inspect both outcomes without recovering into another Effect.

### result

`Effect.result` moves the typed error into a [`Result`](/docs/v4/data-types/result/) in the success channel:

```text showLineNumbers=false
Effect<A, E, R> -> Effect<Result<A, E>, never, R>
```

**Example** (Inspecting a Result)

```ts twoslash import.meta.vitest name="inspecting-an-effect-result-1"
import { Effect, Result } from "effect"

const result = Effect.runSync(Effect.result(Effect.fail("unavailable")))

Result.match(result, {
  onFailure: (error) => `failure: ${error}`,
  onSuccess: (value) => `success: ${value}`,
}) // => "failure: unavailable"
```

`Effect.result` handles typed failures only. Defects and interruptions remain failures of the fiber.

### option

`Effect.option` discards the error value, returning `Option.some(value)` on success and `Option.none()` on a typed failure.

```ts twoslash import.meta.vitest name="converting-an-effect-to-option-1"
import { Effect, Option } from "effect"

Effect.runSync(Effect.option(Effect.succeed(1))) // => Option.some(1)
Effect.runSync(Effect.option(Effect.fail("unavailable"))) // => Option.none()
```

Use `result` when the error value matters and `option` only when every typed failure means absence.

## Catching Every Typed Error

`Effect.catch` handles every typed error with a recovery Effect. It does not catch defects or interruptions.

**Example** (Recovering from Every Typed Error)

```ts twoslash import.meta.vitest name="recovering-from-every-typed-error-1"
import { Effect } from "effect"

const program = Effect.fail("unavailable").pipe(
  Effect.catch((error) => Effect.succeed(`recovered: ${error}`)),
)

Effect.runSync(program) // => "recovered: unavailable"
```

When the handler cannot fail, `Effect.catchEager` is an eager optimization for recovery Effects that can be evaluated immediately.

Use [`Effect.catchCause`](/docs/v4/error-management/unexpected-errors/#catchcause) when the handler needs the complete failure cause.

## Catching Selected Errors

Selective catch operators preserve all unmatched errors in the error channel.

### catchTag

`Effect.catchTag` handles one member of a tagged error union and removes that member from the resulting error type.

**Example** (Catching One Tagged Error)

```ts twoslash import.meta.vitest name="catching-one-tagged-error-1"
import { Data, Effect } from "effect"

class NetworkError extends Data.TaggedError("NetworkError")<{
  readonly status: number
}> {}

class ValidationError extends Data.TaggedError("ValidationError")<{
  readonly field: string
}> {}

const request: Effect.Effect<string, NetworkError | ValidationError> =
  Effect.fail(new NetworkError({ status: 503 }))

// Effect<string, ValidationError>
const recovered = request.pipe(
  Effect.catchTag("NetworkError", (error) =>
    Effect.succeed(`cached after ${error.status}`),
  ),
)

Effect.runSync(recovered) // => "cached after 503"
```

`catchTag` also accepts a non-empty array of tags when several tagged errors share one handler.

### catchTags

`Effect.catchTags` handles several tagged errors with a table of tag-specific handlers.

**Example** (Catching Several Tagged Errors)

```ts twoslash import.meta.vitest name="catching-several-tagged-errors-1"
import { Data, Effect } from "effect"

class NetworkError extends Data.TaggedError("NetworkError")<{
  readonly status: number
}> {}

class ValidationError extends Data.TaggedError("ValidationError")<{
  readonly field: string
}> {}

const request: Effect.Effect<string, NetworkError | ValidationError> =
  Effect.fail(new ValidationError({ field: "email" }))

const recovered = request.pipe(
  Effect.catchTags({
    NetworkError: (error) => Effect.succeed(`network: ${error.status}`),
    ValidationError: (error) => Effect.succeed(`invalid: ${error.field}`),
  }),
)

Effect.runSync(recovered) // => "invalid: email"
```

### catchIf

`Effect.catchIf` selects errors with a predicate or type guard.

```ts twoslash import.meta.vitest name="catching-an-error-with-a-predicate-1"
import { Effect } from "effect"

const program = Effect.fail(404).pipe(
  Effect.catchIf(
    (status) => status === 404,
    () => Effect.succeed("not found"),
  ),
)

Effect.runSync(program) // => "not found"
```

### catchFilter

`Effect.catchFilter` uses the `Filter` module for reusable or composable selection logic. A narrowing filter also removes the handled subtype from the error channel.

**Example** (Catching with a Filter)

```ts twoslash import.meta.vitest name="catching-an-error-with-a-filter-1"
import { Data, Effect, Filter } from "effect"

class NetworkError extends Data.TaggedError("NetworkError")<{}> {}
class ValidationError extends Data.TaggedError("ValidationError")<{}> {}

const task: Effect.Effect<string, NetworkError | ValidationError> = Effect.fail(
  new NetworkError(),
)

const program = task.pipe(
  Effect.catchFilter(Filter.tagged("NetworkError"), () =>
    Effect.succeed("using cache"),
  ),
)

Effect.runSync(program) // => "using cache"
```

## Catching Nested Error Reasons

Some tagged errors contain another tagged error in a readonly `reason` field. `Effect.catchReason` handles one nested reason while keeping the parent error type for unmatched reasons; `Effect.catchReasons` handles several.

**Example** (Catching a Nested Reason)

```ts twoslash import.meta.vitest name="catching-a-nested-error-reason-1"
import { Data, Effect } from "effect"

class RateLimitError extends Data.TaggedError("RateLimitError")<{
  readonly retryAfter: number
}> {}

class QuotaExceededError extends Data.TaggedError("QuotaExceededError")<{}> {}

class ApiError extends Data.TaggedError("ApiError")<{
  readonly reason: RateLimitError | QuotaExceededError
}> {}

const request: Effect.Effect<string, ApiError> = Effect.fail(
  new ApiError({ reason: new RateLimitError({ retryAfter: 30 }) }),
)

const program = request.pipe(
  Effect.catchReason("ApiError", "RateLimitError", (reason) =>
    Effect.succeed(`retry after ${reason.retryAfter}s`),
  ),
)

Effect.runSync(program) // => "retry after 30s"
```

Use `Effect.unwrapReason(errorTag)` when the nested reasons should replace the parent error in the error channel instead of being handled immediately.
