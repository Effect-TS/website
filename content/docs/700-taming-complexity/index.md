---
title: Taming Complexity with Effects
---

Writing software is easy. Unfortunately, "the real world" constantly likes to
get in our way, introducing additional complexity that makes it hard for us to
do what we want to do.

<!-- If we can do Twitter embed, see @kentbeck's famous tweet on refactoring to make the hard thing easy -->

Let's say we have a revolutionary new app idea: a todo list app. Our core
application logic is simple -- it just fetches TODO items from a JSON API.

```ts twoslash
/// <reference path="node_modules/@types/node/index.d.ts" />
// ---cut---
interface TodoItem {}

const getTodoPromise = async (id: number): Promise<unknown> => {
  const res = await fetch(`https://jsonplaceholder.typicode.com/todos/${id}`)

  return (await res.json()) as TodoItem
}
```

See -- easy! But... this won't take us very far. There is a whole raft of "real world" complexity that we're not handling:

- How can we efficiently get multiple todos at once?
- What if the network goes down or the API misbehaves?
- What if the user changes their mind after requesting a todo?
- How can we test this code without hitting the real API?
- What if the API requires authentication?
- How do we manage the user's credentials responsibly?
- How can we inspect our code's execution to be sure it's doing what we expect?

These are all "incidental" complexity -- they feel like distractions from our
application's true purpose. This is exactly the kind of complexity that Effect's
abstractions are designed to help us solve; taming the complexity of the real
world without getting in the way of our core application logic.

## From Promises to Effects

Before we get any further, we need to convert our promise-returning function
into one that returns an Effect. The reasons for this will become clear as we
use the Effect to manage the complexity above.

```ts
const getTodo = (id: number) =>
  Effect.tryCatchPromise(
    () => getTodoPromise(id),
    (error) => new Error(`Uh-oh, something went wrong while getting todo #${id}!`),
  )
```

We've wrapped our `getTodoPromise` function to make it return an `Effect`
instead. What does that mean? The key is to look at the _type_ of `getTodo` (go
ahead and hover your mouse over it above).

As a [reminder](../200-what-is-effect/), an `Effect` type is composed of three
things: the `R`equirements, the `E`rror, and the Success (`A`) types. By keeping
the Error and Success types separate, we are documenting to consumers of
`getTodo` that this function _should_ return a `TodoItem`, but it _may_ result
in an error of type `Error` instead. We're also documenting that `getTodo` has
no "Requirements", so our consumer can invoke the effect without providing
anything more (we'll revisit that when we look at dependency injection later).

Keep reading to find out how this simple abstraction can be powerful enough to
tackle all the complexity described above!

# Concurrency

In the real world, we need to exploit concurrency. Fetching todos one-at-a-time
is inefficient when our user's computer can do so much more!

A naive approach to fetching multiple todos might look like this:

```ts twoslash
const getManyTodosPromise = async (ids: number[]) => {
  const todos: unknown[] = []

  for (const id of ids) {
    todos.push(await getTodoPromise(id))
  }

  return todos
}
```

This is undesirable for the reason described above -- we're waiting for each
todo to resolve before moving onto the next one. You might use `Promise.all`
for executing promises in parallel:

```ts
const getManyTodosParallelPromise = async (ids: number[]) => {
  const todos: Promise<unknown>[] = []

  for (const id of ids) {
    todos.push(getTodoPromise(id))
  }

  return await Promise.all(todos)
}
```

Great -- we're running things in parallel, but have we gone _too_ far? Trying to
fetch hundreds of todos all at once may drain our user's resources (not to
mention hit the API's rate limit!).

We could split up `ids` into chunks, but that approach would still not maximise
parallelism. For example, imagine that one request in every chunk performs much
slower than the rest. We'd have to wait for that request to finish before even
starting the next chunk.

To maximise parallelism, we'd have to send off the first batch, keep track of
the rest, and then fire off one new request in response to each previous
request's resolution. Our simple application logic is starting to get buried
under real-world complexities - and that's without even thinking about
error-handling!

## With Effect

One problem with the previous approach is that we've mixed up the code that
_coordinates_ the requests with the code that actually _performs_ the
requests. We keep track of requests by keeping an array of `Promise`s, but these
requests are already in flight by the time the array is constructed.

In the Effect world, this is avoided by separating the construction of an Effect
from its eventual execution. This allows us to create a whole bunch of `Effect`s
which will each fetch a `TodoItem` when invoked, and separately coordinate their
executions in a way that suits us.

```ts
const getManyTodos = (ids: number[]) => {
  // prepare effects for every single todo (but don't execute them yet)
  const todoEffects = ids.map(getTodo)

  // create an effect which collects the results of the individual effects
  // (but still doesn't execute anything yet!)
  const combinedEffect = Effect.collectAllPar(() => todoEffects)

  // finally, modify `combinedEffect` to impose a maximum parallelism
  // (and _still_ don't execute anything! We'll let the caller do that)
  return Effect.withParallelism(15)(combinedEffect)
}
```

In three lines, we have achieved the complexity that we struggled to previously
express, without clouding the simplicity of the core application logic.

A sceptic may argue that this is just a sleight of hand -- that the complexity
remains, only having been hidden inside `Effect.withParallelism`. The sceptic is
correct. However, it's important to realise that it is only possible to write a
function like `withParallelism` because we have separated the execution of an
action from the description of the action.

We could do something similar by replacing the promises in the first example
with thunks or "lazy" `Promise`s. We would then have an array of thunks which we
could coordinate however we like before executing them. This is a good mental
model for `Effect`s: a way for our code to describe actions, in a way that can
be further manipulated without actual execution.

The sceptic's sleight of hand argument also points to a good mental model for
the Effect library. Effect is a simple abstraction (the `Effect` type), provided
alongside a vast array of "batteries included" utilities to make this
abstraction so powerful.

# Error Handling

In the real world, things sometimes go wrong. We don't want our users exposed to
scary error messages, so we'll need to add some error handling. Traditionally,
we might add a try/catch block -- but this adds complexity to our application
logic!

You should recall that `Effect` has already separated our effect's results into
"Success" and "Error" cases. But what does that mean for us? If
`getTodoPromise` throws an error (aka "rejects"), it might look as though all we've really done is
create another Error object, albeit one with a slightly nicer error message.

The secret is that by keeping the Success and Error types separate, we can allow
consumers to choose which they want to focus on. When executed, the `Effect`
_should_ return a `TodoItem`, but it _may_ result in an `Error`
instead. This `Effect` can be further manipulated, allowing other parts of our
application to handle the error if they're in a suitable place to do so (e.g.
rendering a UI to our user), or focus on the happy path, leaving the Error
channel for later.

Let's imagine that I want to save the `TodoItem` to a database it after
retrieving it from the API. When I'm writing the save logic, I don't want
to be thinking about whether the TodoItem was fetched succcessfully in the first
place. I can write simpler code if I simply assume that it has -- so I will
write a function that includes it as a parameter.

```ts
// the implementation is not important for now
const saveTodoItem = (x: TodoItem) => Effect.succeed('Item Saved Successfully')
```

`saveTodoItem` can only be invoked if I already have a `TodoItem`, so by
writing it this way I don't have to worry about how `getTodo` might fail. I
get to keep my logic simple!

... Until I remember that I am also the person responsible for wiring together
`getTodo` and `saveTodoItem`. Luckily, Effect's separation of Success and
Error types will make this easy!

`Effect.flatMap` is a function which some people might call a "combinator". It
creates an `Effect` by first receiving an `Effect` and transforming it in some
way. Specifically, `flatMap` creates an `Effect` which invokes the first
`Effect` and transforms its results. If the first `Effect` is successful, the
callback provided to `flatMap` is called with the successful result as input.
The callback will itself return an `Effect` -- and it is the contents of this
`Effect` which will ultimately be returned to the caller when the overall
`Effect` is invoked. If the first `Effect` is _not_ successful, then the
callback is skipped completely, and the original (unsuccessful) `Effect` result
is returned directly.

This can be a bit confusing to think about, but if you replace the word `Effect`
with the word `Array` (along with "invoke"->"traverse" and
"successful"->"non-empty"), you might find that you've already used this pattern
before to transform an an array using a callback which itself returns arrays.

Let's see it in practice:

```ts
const getAndSaveTodo = (id: number) => {
    // First, we create an effect to fetch the Todo
    const todoEffect = getTodo(id);

    const getAndSaveEffect = pipe(
        todoEffect,
        // Then, we ask Effect to follow up by calling `saveTodoItem` on the results of `todoEffect`
        Effect.flatMap(saveTodoItem);
    )

    return getAndSaveEffect
}
```

In the example above, `saveTodoItem` creates another `Effect`, which will only
be executed if the previous one (`getTodo`) has succeeded. If getting the todo
failed, then the `flatMap` call will be skipped completely and the error will be
propagated through to an eventual handler.

It's impossible to "forget" to handle the error, because the error type is
persisted throughout `Effect` manipulations. It will remain in the result type
as a nagging reminder. In contrast, a `Promise` doesn't have an error type at
all, so it's impossible to know whether a function which returns a `Promise`
even needs error-handling in the first place.

To access this propagated error, we can use `Effect.catchAll`. This function is
a kind of an inverse to `flatMap`: it will only call the provided callback if
the previous `Effect` was _not_ successful.

```ts
// the implementation is not important for now -- but note that the Result type is the same
// as `getAndSaveTodo` (string), while the Failure type is different (never vs `Error`)
const gracefullyRenderError = (x: Error) => Effect.succeed('Error Message Displayed')

const getTodoAndSaveWithErrorHandling = (id: number) => pipe(getFormattedTodo, Effect.catchAll(gracefullyRenderError))
```

The final `Effect` type gives us confidence -- the Error type is `never`,
meaning that we have recovered from all known errors, and we can't do any
further error handling. What's more, we've done this without modifying our base
application logic. When the application requirements change in future, we'll be
able to modify that code without needing to pick through the error-handling code
first.

## Strongly-typed errors

In the previous example, there are at least two different failure modes. The
network request could fail, or it could succeed but return invalid JSON. We
haven't distinguished between these conditions, but in reality we're likely to
want to handle them quite differently -- for example, we might want to retry a
failed network request, but there may be no sense in retrying if it's returning
gibberish.

To represent this, we can break our original applicaiton logic apart, so that each promise is separately caught. We're also going to introduce a dedicated error class for each case. Effect uses a special `_tag` property to discriminate unions, so we get more functionality "for free" if we do the same.

First, we'll write a new function to fetch todo items, with a strongly-typed error class:

```ts
export class TodoFetchError {
  readonly _tag = 'TodoFetchError'
}

export const fetchTodo = (id: number) =>
  Effect.tryCatchPromise(
    () => fetch(`https://jsonplaceholder.typicode.com/todos/${id}`),
    (error) => new TodoFetchError(),
  )
```

Next, a generic function to parse `fetch` response bodies as JSON

```ts
export class JsonBodyError {
  readonly _tag = 'JsonBodyError'
}

export const jsonBody = (input: Response) =>
  Effect.tryCatchPromise(
    (): Promise<unknown> => input.json(),
    (error) => new JsonBodyError(),
  )
```

Finally, put them together to create a new `getTodo`, this time with a more
informative error type describing both failure modes

```ts
import { flow } from '@fp-ts/core/function'

const getTodo = flow(fetchTodo, Effect.flatMap(jsonBody))
```

Looking at the inferred type for `getTodo`, we can explicitly see that it returns:

```ts
type getTodo = Effect<never, TodoFetchError | JsonBodyError, unknown>
```

You can read this as "an operation with no requirements, which when performed
may return data of type `unknown`, or may fail with a `TodoFetchError` or a
`JsonBodyError`". As above, we can manipulate the effect to create one which
handles failures, allowing consumers to use the effect without worrying about
errors. This time, we're going to use `catchTag` instead of `catchAll`, to tell
Effect to only invoke the callback if the Error value matches the given tag.

```ts
// Ignore the fact that this function would be impossible to implement in practice!
declare const magicRecoverFetch: (error: TodoFetchError) => Effect<never, never, Todo>

export const getTodoWithoutFetchErrors = flow(
  getTodo,
  Effect.catchTag('TodoFetchError', (error) => magicRecoverFetch(error)),
)
```

By using `catchTag`, Effect can pick out the relevant error type to catch from
the union of error types. The final result type for `getTodoWithoutFetchErrors`
is `Effect<never, JsonBodyError, unknown>`, indicating to callers that it may
return a `JsonBodyError`, but it will no longer return a `TodoFetchError`.

## Caveat: Unexpected Errors

TODO

# Canceling Effects

- In the real world, users change their mind

```ts twoslash
// example showing cancellation
```

# Dependency Injection

- In the real world, we need to change systems over time

```ts twoslash
// example showing dependency injection (e.g. to test w/o real API)
// (include Layer context construction)
```

# Observability

- In the real world, we need to debug and see what's happening

```ts twoslash
// example showing logging, tracing and metrics
```

# Scope

- In the real world, we have to clean up after ourselves

```ts twoslash
// example showing scope management (traditional e.g. is a file descriptor, but
// we could also use scope to manage a "login" session - acquire an API token,
// then explicitly log out afterwards)
```

# Error Recovery

- In the real world, we want to retry on failure

```ts twoslash
// example showing simple error recovery
// example showing schedule-based error recovery w/ exponential backoff
```

# Controlling the Uncontrollable

- In the real world, we need to control for variables

```ts twoslash
// example showing random utilities
// example showing Clock and time utilieis (maybe -- I haven't looked to see what these do yet)
```

<!--
// TODO (I haven't looked at these parts of Effect yet so I don't understand how they work!)

- Runtime: Runtime Configuration and Runner
- Ref: Mutable Reference to immutable State with potentially Syncronized access and updates
- Deferred: Like a Promise of an Effect that may be fulfilled at a later point
- STM: Transactional Data Structures & Coordination
- Semaphore: Concurrency Control
- Supervisor: Fiber Monitoring
- Fiber: Low Level Concurrency Primitives
- Hub: Like a Pub/Sub for Effects
- Stream: Pull Based Effectful Streams (like an Effect that can produce 0 - infinite values)
- Queue: Work-Stealing Concurrent & Backpressured Queues
- Schema validation (but maybe that's an fp-ts responsibility to document)
-->
