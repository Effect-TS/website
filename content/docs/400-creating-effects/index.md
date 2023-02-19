---
title: Creating Effects
---

Effects can be created from many different cases, you can find all the ways by looking up the [Reference Docs](https://effect-ts.github.io/io/modules/Effect.ts.html#constructors).

Note: you can hover on the examples code and check types like you would do in an IDE.

## Create Effect From a Value

When dealing with pure values (things like primitives or constructed objects) you can use the `succeed` function.

```ts twoslash
import { Effect } from 'effect'

/**
 * @type Effect<never, never, string>
 */
export const fromValue = Effect.succeed('hello world')
```

The return type as highlightes is `Effect<never, never, string>` which can be read as "An effect that doesn't require any context, cannot produce any typed failure and succeeds with a value of type `string`.

## Create Effect From a Thunk

When dealing with synchronous side effects or values that are expensive to compute in order to defer evaluation you can use the `sync` function.

```ts twoslash
import { Effect } from 'effect'

/**
 * @type Effect<never, never, void>
 */
export const logHelloWorld = Effect.sync(() => console.log('hello world'))
```

## Create Effect From a Promise

When dealing with asynchronous side effects such as web requests that use `Promise` you can use the `promise` function.

```ts twoslash
import { Effect } from 'effect'

/**
 * @type Effect<never, never, Response>
 */
export const fetchFirstTodo = Effect.promise(() => fetch('https://jsonplaceholder.typicode.com/todos/1'))
```

By reading the return type we can see that it is `Effect<never, never, Response>` but our `fetch` call may produce an error in case something goes wrong with the connection (or really anything, like any thrown exception from the thunk invocation).

Effect by default catches every thrown exception from your code in order not to lose any errors and produce a proper, human readable, failure message. Those unexpected failures don't appear in the `Error` type as they can be of any shape and the programmer is not expected to explicitely handle such cases.

If you want to make the failure explicit and potentially be able to handle it in a type safe manner at a later point you can use the `tryCatchPromise` function.

```ts twoslash
import { Effect } from 'effect'

/**
 * It is best to have a discriminator `_tag` specified
 * in the type to be able to better distinguish between
 * different errors when handling them.
 *
 * Note: it is not needed to use a class, we use classes
 * for the purpose of having a constructor.
 */
export class FetchError {
  readonly _tag = 'FetchError'
  constructor(readonly error: unknown) {}
}

/**
 * @type Effect<never, FetchError, Response>
 */
export const fetchFirstTodo = Effect.tryCatchPromise(
  () => fetch('https://jsonplaceholder.typicode.com/todos/1'),
  (error) => new FetchError(error),
)
```

We can see that now the fact that the `fetchFirstTodo` Effect can fail is explicit in the `Error` channel as `Effect<never, FetchError, Response>`.

Many APIs such as the `fetch` function that we are using for this example can be interrupted, interruption is a fundamental aspect of safe programming, for example even in simple cases such as a `UI` you don't want pending requests running if you already know you will be discarding the response.

Effect has a comprehensive model for interruption where interruption can be asynchronous and coordinated but for simple cases such as cancelling a `fetch` request we can use the `tryCatchPromiseAbort` that provides a managed `AbortSignal`.

```ts
import { Effect } from 'effect'

export class FetchError {
  readonly _tag = 'FetchError'
  constructor(readonly error: unknown) {}
}

/**
 * @type Effect<never, FetchError, Response>
 */
export const fetchFirstTodo = Effect.tryCatchPromiseAbort(
  (signal) => fetch('https://jsonplaceholder.typicode.com/todos/1', { signal }),
  (error) => new FetchError(error),
)
```

As you can see the `AbortSignal` is provided directly by `Effect` and you don't have to manually care about managing the underlying `AbortController` and about passing around the signal.

## Create Effect From a Callback

Sometimes you have to deal with APIs that are not returning `Promise` but are implemented in the "old-school" callback style, for example when dealing with `Node.js`. For such cases Effect provides the `async` function (and a few variants of it).

Note: While being "old-school", callback style APIs are inherently more powerful than `Promises` as they are both faster and more precise in specifying the failure scenario. When using Effect there is no reason why not to use them.

For the purpose of this example we will be using the `Node.js` file-system module.

```ts twoslash
import { Effect } from 'effect'
import * as FS from 'node:fs'

export class ReadFileError {
  readonly _tag = 'ReadFileError'
  constructor(readonly error: NodeJS.ErrnoException) {}
}

/**
 * @type Effect<never, ReadFileError, Buffer>
 */
export const readTodos = Effect.async<never, ReadFileError, Buffer>((resume) => {
  FS.readFile('todos.txt', (error, data) => {
    if (error) {
      resume(Effect.fail(new ReadFileError(error)))
    } else {
      resume(Effect.succeed(data))
    }
  })
})
```

As you can see this time we were forced to manually annotate the types required by the `async` function, similarly to using the native `new Promise()` constructor TypeScript is not capable of inferring the type parameters from usage inside the body, that is a minor drawback of callback based APIs.

When using Effect we don't really want to call the constructors everywhere, it is very common to define functions that wraps other APIs into an Effect-first one, for example refactoring the previous code into:

```ts twoslash
import { Effect } from 'effect'
import * as FS from 'node:fs'

export class ReadFileError {
  readonly _tag = 'ReadFileError'
  constructor(readonly error: NodeJS.ErrnoException) {}
}

export const readFile = (path: string) =>
  Effect.async<never, ReadFileError, Buffer>((resume) => {
    FS.readFile(path, (error, data) => {
      if (error) {
        resume(Effect.fail(new ReadFileError(error)))
      } else {
        resume(Effect.succeed(data))
      }
    })
  })

/**
 * @type Effect<never, ReadFileError, Buffer>
 */
export const readTodos = readFile('todos.txt')
```

Just like in the prior case when creating Effects from Promises it is very common to want the ability of interrupting work, for such cases you can use the `asyncInterrupt` variant that allows for control of the interruption., we will be creating an Effect that sleeps for a period of time before returning, wrapping the `setTimeout` API.

```ts twoslash
import * as Effect from '@effect/io/Effect'
import * as Either from '@fp-ts/core/Either'

export const sleep = (milliseconds: number) =>
  Effect.asyncInterrupt<never, never, void>((resume) => {
    // kicking off the async process
    const timer = setTimeout(() => {
      resume(Effect.unit())
    }, milliseconds)

    // specifying what to do in case of interruption
    return Either.left(
      Effect.sync(() => {
        clearTimeout(timer)
      }),
    )
  })

/**
 * @type Effect<never, never, void>
 */
export const sleepFor60Seconds = sleep(60_000)
```

We can spot two things:

- the first one is that we have to return an `Either.left()` of an `Effect`, that is because the `asyncInterrupt` function enables for potentially returning in sync what `Effect` should be executed next, this while being very low-level it is important for cases where we only want to suspend execution conditionally.

- the second is that interruption is no longer a fire and forget but a full blown `Effect`, this gives you more control for patterns where cancellation should be awaited, like for example when dealing with database connections.
