---
title: From Failure
---

Just like any other program, Effect programs may fail for expected or unexpected reasons. The difference between a non-Effect program and an Effect program is in the detail provided to you when your program fails. Effect attempts to preserve as much information as possible about what caused your program to fail to produce a detailed, comprehensive, and human readable failure message.

In an Effect program, there are three possible ways for a program to fail:

  1. Expected Errors
  2. Unexpected Errors
  3. Fiber Interruption

## Expected Errors

Expected errors, also known as _failures_, _typed errors_ or _recoverable errors_, are errors that the developer expects to happen as part of normal program execution. These errors are similar in spirit to checked exceptions and should be part of a program's domain and control flow.

Expected errors are also tracked at the type level by the `Effect` data type in the `Error` channel.

### Creating an Effect from a Failure

The simplest way to represent an expected program failure with Effect is to use the `fail` combinator:

```ts twoslash
import * as Effect from "@effect/io/Effect"

const fromFailure = Effect.fail("failure")
//    ^?
```

By inspecting the type of `fromFailure`, we can see it is `Effect<never, string, never>`. This type can be interpreted as:

> An effect that does not require any context, fails with a value of type `string`, and never succeeds

### Making Failures Explicit

To ensure that your programs are able to handle expected errors in a robust and maintainable way, Effect encourages programmers to make expected failure cases explicit in their programs.

As an example, let's take closer look at one our previous snippets from the documentation on constructing Effects [from success values](./100-from-successes.md):

```ts twoslash
import * as Effect from "@effect/io/Effect"

export const fetchFirstTodo = Effect.promise(() => fetch("https://jsonplaceholder.typicode.com/todos/1"))
//           ^?
```

Thinking deeper on the example above, one may realize there is a significant problem with this code. Our call to `fetch` may fail (e.g. if there are problems with the connection), but we have not made that expected failure _explicit_ (i.e. if the call to `fetch` fails it will throw an exception). Effect by default will catch thrown exceptions to avoid loss of any error-related information and produce a proper, human readable, failure message. But in Effect terms, thrown exceptions are generally considered [**unexpected** errors](#unexpected-errors).

Instead, let's take the example above and make the failure case explicit. This way, we can potentially handle that failure later as part of our program's control flow:

```ts twoslash
import * as Effect from "@effect/io/Effect"

/**
 * In general, it's better to fail with an object that has a `_tag` field
 * specified. Effect comes with a few functions built specifically to handle
 * "tagged" error objects in a type-safe way (i.e. `catchTag`, `catchTags`).
 *
 * Note: In our example below, we use a class to define our error. However,
 * classes are not required. For this example we use a class simply to gain
 * access to a free constructor.
 */
export class FetchError {
  readonly _tag = "FetchError"
  constructor(readonly error: unknown) {}
}

export const fetchFirstTodo = Effect.attemptCatchPromise(
//           ^?
  () => fetch("https://jsonplaceholder.typicode.com/todos/1"),
  (error) => new FetchError(error),
)
```

Now, we can observe that `fetchFirstTodo` _explicitly_ specifies that it can either succeed with a `Response` or fail with a `FetchError`.

## Unexpected Errors

Unexpected errors, also known as _defects_, _untyped errors_ or _unrecoverable errors_, are errors that the developer does not expect to happen as part of normal program execution. These errors are similar in spirit to unchecked exceptions and are not part of a program's domain or control flow.

Because these errors are not expected to happen, Effect does not track them at the type level. However, the Effect runtime does keep track of these errors and provides several methods which facilitate recovering from unexpected errors.

## Interruption

Interruption errors are caused by interrupting execution of a running fiber. For a more comprehensive overview of Effect's fiber runtime and interruption model, please see [INSERT LINK HERE](index.md).



