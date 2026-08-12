---
title: Yieldable Errors
description: Define custom errors that can be yielded directly inside Effect.gen.
sidebar:
  order: 11
---

Errors created with `Data.Error` and `Data.TaggedError` are yieldable. Inside [`Effect.gen`](/docs/v4/getting-started/using-generators/), yielding one is equivalent to passing it to [`Effect.fail`](/docs/v4/getting-started/creating-effects/#fail).

## Data.Error

Use `Data.Error` when the error does not need a discriminant tag.

**Example** (Yielding a Custom Error)

```ts twoslash import.meta.vitest name="yielding-a-data-error-1"
import { Data, Effect, Exit } from "effect"

class InvalidInput extends Data.Error<{
  readonly message: string
}> {}

const program = Effect.gen(function* () {
  return yield* new InvalidInput({ message: "Name is required" })
})

Effect.runSyncExit(program) // => Exit.fail(new InvalidInput({ message: "Name is required" }))
```

## Data.TaggedError

`Data.TaggedError` adds a readonly `_tag` field. Tagged errors form discriminated unions that can be handled precisely with [`Effect.catchTag`](/docs/v4/error-management/expected-errors/#catchtag) and [`Effect.catchTags`](/docs/v4/error-management/expected-errors/#catchtags).

**Example** (Handling Tagged Errors)

```ts twoslash import.meta.vitest name="handling-yieldable-tagged-errors-1"
import { Data, Effect } from "effect"

class NotFound extends Data.TaggedError("NotFound")<{
  readonly id: string
}> {}

class PermissionDenied extends Data.TaggedError("PermissionDenied")<{
  readonly id: string
}> {}

const loadUser = (
  id: string,
): Effect.Effect<string, NotFound | PermissionDenied> =>
  Effect.gen(function* () {
    if (id === "missing") {
      return yield* new NotFound({ id })
    }
    return `user:${id}`
  })

const program = loadUser("missing").pipe(
  Effect.catchTag("NotFound", (error) => Effect.succeed(`No user ${error.id}`)),
)

Effect.runSync(program) // => "No user missing"
```

Use tagged errors for domain errors that callers may need to distinguish. The class is both the error's constructor and its TypeScript type.
