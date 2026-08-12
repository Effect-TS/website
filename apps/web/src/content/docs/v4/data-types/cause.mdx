---
title: Cause
description: Comprehensive error analysis with Cause in Effect - track failures, defects, and interruptions with precise details.
sidebar:
  order: 2
---

The [`Effect<A, E, R>`](/docs/v4/getting-started/the-effect-type/) type is polymorphic in error type `E`, allowing flexibility in handling any desired error type. However, there is often additional information about failures that the error type `E` alone does not capture.

To address this, Effect uses the `Cause<E>` data type to store various details such as:

- Unexpected errors or defects
- Stack and execution traces
- Reasons for fiber interruptions

Effect strictly preserves all failure-related information, storing a full picture of the error context in the `Cause` type. This comprehensive approach enables precise analysis and handling of failures, ensuring no data is lost.

Though `Cause` values aren't typically manipulated directly, they underlie errors within Effect workflows, providing access to both concurrent and sequential error details. This allows for thorough error analysis when needed.

## Creating Causes

You can intentionally create an effect with a specific cause using `Effect.failCause`.

**Example** (Defining Effects with Different Causes)

```ts twoslash import.meta.vitest name="creating-causes-1"
import { Effect, Cause, Exit } from "effect"

// Define an effect that dies with an unexpected error
//
//      ┌─── Effect<never, never, never>
//      ▼
const die = Effect.failCause(Cause.die("Boom!"))

// Define an effect that fails with an expected error
//
//      ┌─── Effect<never, string, never>
//      ▼
const fail = Effect.failCause(Cause.fail("Oh no!"))

Effect.runSyncExit(fail) // => Exit.fail("Oh no!")
```

Some causes do not influence the error type of the effect, leading to `never` in the error channel:

```text showLineNumbers=false
                ┌─── no error information
                ▼
Effect<never, never, never>
```

For instance, `Cause.die` does not specify an error type for the effect, while `Cause.fail` does, setting the error channel type accordingly.

## Cause Variations

There are several causes for various errors, in this section, we will describe each of these causes.

### Empty

The `Empty` cause signifies the absence of any errors, represented by an empty `reasons` array (`Cause.empty`).

### Fail

The `Fail<E>` reason represents a failure due to an expected error of type `E`. A `Cause<E>` holding only this reason is created with `Cause.fail`.

### Die

The `Die` reason indicates a failure resulting from a defect, which is an unexpected or unintended error. A `Cause` holding only this reason is created with `Cause.die`.

### Interrupt

The `Interrupt` reason represents a failure due to `Fiber` interruption and contains the numeric id (`number | undefined`) of the interrupted `Fiber`. A `Cause` holding only this reason is created with `Cause.interrupt`.

### Combining Causes

`Cause<E>` stores its failure reasons in a flat `reasons` array. Reasons that occurred sequentially and reasons that occurred concurrently use the same representation. Use `Cause.combine` to merge two causes into one.

**Example** (Combining Multiple Failures into One Cause)

```ts twoslash import.meta.vitest name="combining-causes-1"
import { Cause } from "effect"

const combined = Cause.combine(Cause.fail("Oh no!"), Cause.die("Boom!"))

combined.reasons.map((reason) => reason._tag) // => ["Fail", "Die"]
```

## Retrieving the Cause of an Effect

To retrieve the cause of a failed effect, use `Effect.exit` and inspect the `cause` field of a `Failure`. This allows you to inspect or handle the exact reason behind the failure.

**Example** (Retrieving and Inspecting a Failure Cause)

```ts twoslash import.meta.vitest name="retrieving-the-cause-of-an-effect-1"
import { Effect, Exit, Cause } from "effect"

const program = Effect.gen(function* () {
  const exit = yield* Effect.exit(Effect.fail("Oh no!"))
  if (Exit.isFailure(exit)) {
    console.log(exit.cause)
    exit.cause // => Cause.fail("Oh no!")
  }
})

await Effect.runPromise(program)
```

## Guards

To determine what happened inside a `Cause`, the Cause module provides two kinds of guards: cause-level predicates that check whether a `Cause` contains a certain kind of reason, and reason-level guards that narrow an individual entry of `cause.reasons`.

- `Cause.hasFails`: Checks if the cause contains at least one expected failure.
- `Cause.hasDies`: Checks if the cause contains at least one unexpected defect.
- `Cause.hasInterrupts`: Checks if the cause contains at least one fiber interruption.
- `Cause.hasInterruptsOnly`: Checks if every reason in the cause is an interruption.
- `Cause.isFailReason`: Narrows a `Reason` to `Fail`.
- `Cause.isDieReason`: Narrows a `Reason` to `Die`.
- `Cause.isInterruptReason`: Narrows a `Reason` to `Interrupt`.

An empty cause (no errors) is checked with `cause.reasons.length === 0`; there is no dedicated `isEmpty` function.

**Example** (Using Guards to Identify Reason Types)

```ts twoslash import.meta.vitest name="guards-1"
import { Cause } from "effect"

const cause = Cause.fail(new Error("my message"))

for (const reason of cause.reasons) {
  if (Cause.isFailReason(reason)) {
    console.log(reason.error.message)
    reason.error.message // => "my message"
  }
}
```

These guards allow you to accurately identify the reasons behind a `Cause`, making it easier to handle various error cases in your code. Whether dealing with expected failures, unexpected defects, or interruptions, these guards provide a clear method for assessing and managing error scenarios.

## Formatting Reasons

To respond to specific error scenarios with custom behavior, iterate `cause.reasons` and switch on each reason's `_tag`.

**Example** (Formatting Each Reason in a Cause)

```ts twoslash import.meta.vitest name="formatting-reasons-1"
import { Cause } from "effect"

const cause = Cause.combine(
  Cause.fail(new Error("my fail message")),
  Cause.die("my die message"),
)

const formatted = cause.reasons
  .map((reason) => {
    switch (reason._tag) {
      case "Fail":
        return `(error: ${reason.error.message})`
      case "Die":
        return `(defect: ${reason.defect})`
      case "Interrupt":
        return `(fiberId: ${reason.fiberId})`
    }
  })
  .join(", ")

formatted // => "(error: my fail message), (defect: my die message)"
```

## Pretty Printing

Clear and readable error messages are key for effective debugging. The `Cause.pretty` function helps by formatting error messages in a structured way, making it easier to understand failure details.

**Example** (Using `Cause.pretty` for Readable Error Messages)

```ts twoslash import.meta.vitest name="pretty-printing-1"
import { Cause } from "effect"

console.log(Cause.pretty(Cause.empty))
/*
Output:
(empty string)
*/
Cause.pretty(Cause.empty) // => ""

console.log(Cause.pretty(Cause.fail(new Error("my fail message"))))
/*
Output:
Error: my fail message
    ...stack trace...
*/
Cause.pretty(Cause.fail(new Error("my fail message"))).split("\n")[0] // => "Error: my fail message"

console.log(Cause.pretty(Cause.die("my die message")))
/*
Output:
Error: my die message
    ...stack trace...
*/
Cause.pretty(Cause.die("my die message")).split("\n")[0] // => "Error: my die message"

console.log(Cause.pretty(Cause.interrupt(1)))
Cause.pretty(Cause.interrupt(1)) // => "InterruptError: All fibers interrupted without error {\n  [cause]: InterruptCause: The fiber was interrupted by:\n      at fiber (#1)\n}"

console.log(
  Cause.pretty(Cause.combine(Cause.fail("fail1"), Cause.fail("fail2"))),
)
/*
Output:
Error: fail1
    ...stack trace...
Error: fail2
    ...stack trace...
*/
Cause.pretty(Cause.combine(Cause.fail("fail1"), Cause.fail("fail2")))
  .split("\n")
  .filter((line) => line.startsWith("Error:")) // => ["Error: fail1", "Error: fail2"]
```

## Retrieval of Failures and Defects

Filter `cause.reasons` with `Cause.isFailReason` and `Cause.isDieReason` to inspect only the expected errors or unexpected defects that occurred.

**Example** (Extracting Failures and Defects from a Cause)

```ts twoslash import.meta.vitest name="retrieval-of-failures-and-defects-1"
import { Effect, Cause, Exit } from "effect"

const program = Effect.gen(function* () {
  const exit = yield* Effect.exit(
    Effect.all([
      Effect.fail("error 1"),
      Effect.die("defect"),
      Effect.fail("error 2"),
    ]),
  )
  if (Exit.isFailure(exit)) {
    console.log(
      exit.cause.reasons
        .filter(Cause.isFailReason)
        .map((reason) => reason.error),
    )
    exit.cause.reasons.filter(Cause.isFailReason).map((reason) => reason.error) // => ["error 1"]
    console.log(
      exit.cause.reasons
        .filter(Cause.isDieReason)
        .map((reason) => reason.defect),
    )
    exit.cause.reasons.filter(Cause.isDieReason).map((reason) => reason.defect) // => []
  }
})

await Effect.runPromise(program)
```
