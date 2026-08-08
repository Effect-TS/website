---
title: Two Types of Errors
description: Understand the distinction between expected errors and unexpected defects in Effect.
sidebar:
  order: 0
---

Effect distinguishes between errors that are part of a program's domain and unexpected problems that indicate a bug or broken invariant.

## Expected Errors

Expected errors, also called **failures**, **typed errors**, or **recoverable errors**, are part of normal program execution. Examples include invalid input, a missing record, or a rejected request.

They are tracked in the error channel of `Effect`:

```text showLineNumbers=false "HttpError"
         ┌─── Success type
         │        ┌─── Error type
         │        │      ┌─── Requirements
         ▼        ▼      ▼
Effect<string, HttpError, never>
```

The type makes the possible failure visible to callers, who can recover from it with operators such as `Effect.catch` or `Effect.catchTag`.

## Unexpected Errors

Unexpected errors, also called **defects**, are not part of the intended control flow. Examples include failed assertions, impossible states, and bugs in third-party code.

Defects are not tracked in the `Effect` error channel. They are still retained by the runtime in the effect's `Cause`, together with typed failures and fiber interruptions.

Defects usually should not be recovered from inside domain logic. At application boundaries, `Effect.exit`, `Effect.catchDefect`, or `Effect.catchCause` can be used to inspect or report them.
