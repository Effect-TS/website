---
title: From Success
---

Effect provides a variety of constructors which can be used to represent programs that succeed and return some value.

In the sections below, we walk through some of the more common use cases.

## Creating an Effect From a Value

To create an `Effect` from a value, you can use the `succeed` constructor:

```ts twoslash
import * as Effect from "@effect/io/Effect"

export const fromValue = Effect.succeed("Hello, World!")
//           ^?
```

By inspecting the type of `fromValue`, we can see it is `Effect<never, never, string>`. This type can be interpreted as:

> An effect that does not require any context, does not produce any expected failures, and succeeds with a value of type `string`

## Creating an Effect from a Thunk

Generally, to defer a synchronous computation in JavaScript we can use a "thunk".

<Callout>
A "thunk" is a function that takes no arguments and may return some value.
</Callout>

Thunks are primarily useful for delaying the computation of a value until the result of said computation is actually needed.

Somtimes you may want to construct an `Effect` from a "thunk". This can be particularly useful when dealing with:

  1. Synchronous computations that have side-effects (i.e. logging something to the console)
  2. Expensive computations that are expensive to evaluate


To create an `Effect` from a "thunk", we can use the `sync` constructor:

```ts twoslash
import * as Effect from "@effect/io/Effect"

export const logHelloWorld = Effect.sync(() => {
//           ^?
  console.log("Hello, World!")
  return 42
})
```

In the above example, we use `Effect.sync` to defer our side-effecting call to the `console` object until our program is actually executed.

We can also observe that the value that will be returned when this program is executed is of type `number` since we return the value `42` from our "thunk".

## Creating an Effect From a Promise

When dealing with _asynchronous_ side effects that return a `Promise` you can use the `promise` function.

```ts twoslash
import * as Effect from "@effect/io/Effect"

export const fetchFirstTodo = Effect.promise(() => fetch("https://jsonplaceholder.typicode.com/todos/1"))
//           ^?
```

Once again inspecting the return type we can see that it is `Effect<never, never, Response>`.

## Creating an Effect From a Callback

Sometimes you have to deal with APIs that do not support `async/await` or `Promise`, but are instead implemented in the "old-school" callback style. To support callback-based APIs, Effect provides the `async` constructor.

<Callout>
Note: Although callback-based APIs may be _considered_ "old-school", they are inherently more powerful than `Promise`-based APIs. This is because they are both faster than `Promise`-based APIs as well as more precise in handling failures.
</Callout>

As an example, we can demonstrate wrapping `readFile` from the NodeJS `fs` module with Effect:

```ts twoslash
import * as Effect from "@effect/io/Effect"
import * as NodeFS from "node:fs"

export const readTodos = Effect.async<never, NodeJS.ErrnoException, Buffer>((resume) => {
//           ^?
  NodeFS.readFile("todos.txt", (error, data) => {
    if (error) {
      resume(Effect.fail(error))
    } else {
      resume(Effect.succeed(data))
    }
  })
})
```

Something to note in the above example is that we were actually forced to manually annotate the types when calling `Effect.async`. Unfortunately, TypeScript is not capable of inferring the type parameters for a callback based on what is returned inside the body of the callback. This limitation of TypeScript is the one minor drawback of using callback-based APIs.

Another thing to note is that we probably don't want to have to call the `Effect.async` constructor everywhere that we use callback-based APIs. Therefore, it is a very common pattern to define helpers which wrap external APIs into an Effect-based API.

For example, we can refactor the previous code into:

```ts twoslash
import * as Effect from "@effect/io/Effect"
import * as NodeFS from "node:fs"

export const readFile = (path: string): Effect.Effect<never, NodeJS.ErrnoException, Buffer> =>
  Effect.async((resume) => {
    NodeFS.readFile(path, (error, data) => {
      if (error) {
        resume(Effect.fail(error))
      } else {
        resume(Effect.succeed(data))
      }
    })
  })

export const readTodos = readFile("todos.txt")
//           ^?
```
