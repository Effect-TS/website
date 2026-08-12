---
title: Creating Streams
description: Learn various methods for creating Effect streams, from basic constructors to handling asynchronous data sources, pagination, and schedules.
sidebar:
  order: 1
---

In this section, we'll explore various methods for creating Effect `Stream`s. These methods will help you generate streams tailored to your needs.

## Common Constructors

### make

You can create a pure stream by using the `Stream.make` constructor. This constructor accepts a variable list of values as its arguments.

```ts twoslash import.meta.vitest name="make-1"
import { Stream, Effect } from "effect"

const stream = Stream.make(1, 2, 3)

await Effect.runPromise(Stream.runCollect(stream)) // => [1, 2, 3]
```

### empty

Sometimes, you may require a stream that doesn't produce any values. In such cases, you can use `Stream.empty`. This constructor creates a stream that remains empty.

```ts twoslash import.meta.vitest name="empty-1"
import { Stream, Effect } from "effect"

const stream = Stream.empty

await Effect.runPromise(Stream.runCollect(stream)) // => []
```

### void

If you need a stream that contains a single `void` value, you can use `Stream.succeed(void 0)`. This is handy when you want to represent a stream with a single event or signal.

```ts twoslash import.meta.vitest name="void-1"
import { Stream, Effect } from "effect"

const stream = Stream.succeed(void 0)

await Effect.runPromise(Stream.runCollect(stream)) // => [undefined]
```

### range

To create a stream of integers within a specified range `[min, max]` (including both endpoints, `min` and `max`), you can use `Stream.range`. This is particularly useful for generating a stream of sequential numbers.

```ts twoslash import.meta.vitest name="range-1"
import { Stream, Effect } from "effect"

// Creating a stream of numbers from 1 to 5
const stream = Stream.range(1, 5)

await Effect.runPromise(Stream.runCollect(stream)) // => [1, 2, 3, 4, 5]
```

### iterate

With `Stream.iterate`, you can generate a stream by applying a function iteratively to an initial value. The initial value becomes the first element produced by the stream, followed by subsequent values produced by `f(init)`, `f(f(init))`, and so on.

```ts twoslash import.meta.vitest name="iterate-1"
import { Stream, Effect } from "effect"

// Creating a stream of incrementing numbers
const stream = Stream.iterate(1, (n) => n + 1) // Produces 1, 2, 3, ...

await Effect.runPromise(Stream.runCollect(stream.pipe(Stream.take(5)))) // => [1, 2, 3, 4, 5]
```

### scoped

`Stream.scoped` is used to create a single-valued stream from a scoped resource. It can be handy when dealing with resources that require explicit acquisition, usage, and release.

```ts twoslash import.meta.vitest name="scoped-1"
import { Stream, Effect, Console } from "effect"

// Creating a single-valued stream from a scoped resource
const stream = Stream.scoped(
  Stream.fromEffect(
    Effect.acquireUseRelease(
      Console.log("acquire"),
      () => Console.log("use"),
      () => Console.log("release"),
    ),
  ),
)

await Effect.runPromise(Stream.runCollect(stream)) // => [undefined]
/*
Output:
acquire
use
release
*/
```

## From Success and Failure

Much like the `Effect` data type, you can generate a `Stream` using the `fail` and `succeed` functions:

```ts twoslash
import { Stream, Effect } from "effect"

// Creating a stream that can emit errors
const streamWithError: Stream.Stream<never, string> = Stream.fail("Uh oh!")

Effect.runPromise(Stream.runCollect(streamWithError))
// throws Error: Uh oh!

// Creating a stream that emits a numeric value
const streamWithNumber: Stream.Stream<number> = Stream.succeed(5)

Effect.runPromise(Stream.runCollect(streamWithNumber)).then(console.log)
// [ 5 ]
```

## From Arrays

You can construct a stream from an array like this:

```ts twoslash import.meta.vitest name="from-chunks-1"
import { Stream, Effect } from "effect"

// Creating a stream with values from a single array
const stream = Stream.fromArray([1, 2, 3])

await Effect.runPromise(Stream.runCollect(stream)) // => [1, 2, 3]
```

Moreover, you can create a stream from multiple arrays as well:

```ts twoslash import.meta.vitest name="from-chunks-2"
import { Stream, Effect } from "effect"

// Creating a stream with values from multiple arrays
const stream = Stream.fromArrays([1, 2, 3], [4, 5, 6])

await Effect.runPromise(Stream.runCollect(stream)) // => [1, 2, 3, 4, 5, 6]
```

## From Effect

You can generate a stream from an Effect workflow by employing the `Stream.fromEffect` constructor. For instance, consider the following stream, which generates a single random number:

```ts twoslash import.meta.vitest name="from-effect-1"
import { Stream, Random, Effect } from "effect"

const stream = Stream.fromEffect(Random.nextInt)

Effect.runPromise(Stream.runCollect(stream)).then(console.log)
// Example Output: [ 1042302242 ]

// The value is random, but the stream always emits exactly one element
const result = await Effect.runPromise(Stream.runCollect(stream))
result.length // => 1
```

This method allows you to seamlessly transform the output of an Effect into a stream, providing a straightforward way to work with asynchronous operations within your streams.

## From Asynchronous Callback

Imagine you have an asynchronous function that relies on callbacks. If you want to capture the results emitted by those callbacks as a stream, you can use the `Stream.callback` function. This function is designed to adapt functions that invoke their callbacks multiple times and emit the results as a stream.

Let's break down how to use it in the following example:

```ts twoslash import.meta.vitest name="from-asynchronous-callback-1"
import { Stream, Effect, Queue } from "effect"

const events = [1, 2, 3, 4]

const stream = Stream.callback<number>((queue) =>
  Effect.sync(() => {
    events.forEach((n) => {
      setTimeout(() => {
        if (n === 3) {
          // Terminate the stream
          Queue.endUnsafe(queue)
        } else {
          // Add the current item to the stream
          Queue.offerUnsafe(queue, n)
        }
      }, 100 * n)
    })
  }),
)

await Effect.runPromise(Stream.runCollect(stream)) // => [1, 2]
```

The function you pass to `Stream.callback` receives a `Queue` that you use to drive the stream from your asynchronous code. Here's what each of the possible outcomes means:

- Calling `Queue.offerUnsafe` (or the effectful `Queue.offer`) on the queue emits the given element as part of the stream.

- Calling `Queue.fail` (or `Queue.failCauseUnsafe`/`Queue.failCause`) on the queue terminates the stream with the specified error.

- Calling `Queue.endUnsafe`/`Queue.end` on the queue signals the end of the stream, terminating it successfully.

To put it simply, this gives you full control over how your asynchronous callback interacts with the stream, determining when to emit elements, when to terminate with an error, or when to signal the end of the stream.

## From Iterables

### fromIterable

You can create a pure stream from an `Iterable` of values using the `Stream.fromIterable` constructor. It's a straightforward way to convert a collection of values into a stream.

```ts twoslash import.meta.vitest name="fromiterable-1"
import { Stream, Effect } from "effect"

const numbers = [1, 2, 3]

const stream = Stream.fromIterable(numbers)

await Effect.runPromise(Stream.runCollect(stream)) // => [1, 2, 3]
```

### fromIterableEffect

When you have an effect that produces a value of type `Iterable`, you can employ the `Stream.fromIterableEffect` constructor to generate a stream from that effect.

For instance, let's say you have a database operation that retrieves a list of users. Since this operation involves effects, you can utilize `Stream.fromIterableEffect` to convert the result into a `Stream`:

```ts twoslash import.meta.vitest name="fromiterableeffect-1"
import { Stream, Effect, Context } from "effect"

class Database extends Context.Service<
  Database,
  { readonly getUsers: Effect.Effect<Array<string>> }
>()("Database") {}

const getUsers = Database.use((_) => _.getUsers)

const stream = Stream.fromIterableEffect(getUsers)

await Effect.runPromise(
  Stream.runCollect(
    stream.pipe(
      Stream.provideService(Database, {
        getUsers: Effect.succeed(["user1", "user2"]),
      }),
    ),
  ),
) // => ["user1", "user2"]
```

This enables you to work seamlessly with effects and convert their results into streams for further processing.

### fromAsyncIterable

Async iterables are another type of data source that can be converted into a stream. With the `Stream.fromAsyncIterable` constructor, you can work with asynchronous data sources and handle potential errors gracefully.

```ts twoslash import.meta.vitest name="fromasynciterable-1"
import { Stream, Effect } from "effect"

const myAsyncIterable = async function* () {
  yield 1
  yield 2
}

const stream = Stream.fromAsyncIterable(
  myAsyncIterable(),
  (e) => new Error(String(e)), // Error Handling
)

await Effect.runPromise(Stream.runCollect(stream)) // => [1, 2]
```

In this code, we define an async iterable and then create a stream named `stream` from it. Additionally, we provide an error handler function to manage any potential errors that may occur during the conversion.

## From Repetition

### Repeating a Single Value

You can create a stream that endlessly repeats a specific value using `Stream.forever(Stream.succeed(value))`:

```ts twoslash import.meta.vitest name="repeating-a-single-value-1"
import { Stream, Effect } from "effect"

const stream = Stream.forever(Stream.succeed(0))

await Effect.runPromise(Stream.runCollect(stream.pipe(Stream.take(5)))) // => [0, 0, 0, 0, 0]
```

### Repeating a Stream's Content

`Stream.repeat` allows you to create a stream that repeats a specified stream's content according to a schedule. This can be useful for generating recurring events or values.

```ts twoslash import.meta.vitest name="repeating-a-streams-content-1"
import { Stream, Effect, Schedule } from "effect"

// Creating a stream that repeats a value indefinitely
const stream = Stream.repeat(Stream.succeed(1), Schedule.forever)

await Effect.runPromise(Stream.runCollect(stream.pipe(Stream.take(5)))) // => [1, 1, 1, 1, 1]
```

### Repeating an Effect's Result

Imagine you have an effectful API call, and you want to use the result of that call to create a stream. You can achieve this by creating a stream from the effect and repeating it indefinitely.

Here's an example of generating a stream of random numbers:

```ts twoslash import.meta.vitest name="repeating-an-effects-result-1"
import { Stream, Effect, Random } from "effect"

const stream = Stream.fromEffectRepeat(Random.nextInt)

Effect.runPromise(Stream.runCollect(stream.pipe(Stream.take(5)))).then(
  console.log,
)
/*
Example Output:
[ 1666935266, 604851965, 2194299958, 3393707011, 4090317618 ]
*/

// The values are random, but the stream always emits exactly 5 elements
const result = await Effect.runPromise(
  Stream.runCollect(stream.pipe(Stream.take(5))),
)
result.length // => 5
```

### Repeating an Effect with Termination

You can repeatedly evaluate a given effect and terminate the stream based on specific conditions.

In this example, we're draining an `Iterator` to create a stream from it:

```ts twoslash import.meta.vitest name="repeating-an-effect-with-termination-1"
import { Stream, Effect, Cause } from "effect"

const drainIterator = <A>(it: Iterator<A>): Stream.Stream<A> =>
  Stream.fromEffectRepeat(
    Effect.sync(() => it.next()).pipe(
      Effect.andThen((res) => {
        if (res.done) {
          return Cause.done()
        }
        return Effect.succeed(res.value)
      }),
    ),
  )

const numbers = [10, 20, 30]

await Effect.runPromise(
  Stream.runCollect(drainIterator(numbers[Symbol.iterator]())),
) // => [10, 20, 30]
```

### Generating Ticks

You can create a stream that emits `void` values at specified intervals using the `Stream.tick` constructor. This is useful for creating periodic events.

```ts twoslash import.meta.vitest name="generating-ticks-1"
import { Stream, Effect } from "effect"

const stream = Stream.tick("100 millis")

await Effect.runPromise(Stream.runCollect(stream.pipe(Stream.take(5)))) // => [undefined, undefined, undefined, undefined, undefined]
```

## From Unfolding/Pagination

In functional programming, the concept of `unfold` can be thought of as the counterpart to `fold`.

With `fold`, we process a data structure and produce a return value. For example, we can take an `Array<number>` and calculate the sum of its elements.

On the other hand, `unfold` represents an operation where we start with an initial value and generate a recursive data structure, adding one element at a time using a specified state function. For example, we can create a sequence of natural numbers starting from `1` and using the `increment` function as the state function.

### Unfold

#### unfold

The Stream module includes an `unfold` function defined as follows:

```ts showLineNumbers=false
declare const unfold: <S, A, E, R>(
  initialState: S,
  step: (s: S) => Effect.Effect<readonly [A, S] | undefined, E, R>,
) => Stream<A, E, R>
```

Here's how it works:

- **initialState**. This is the initial state value.
- **step**. The state function `step` takes the current state `s` as input and returns an effect. If the effect resolves to `undefined`, the stream ends. If it resolves to a tuple `[A, S]`, the next element in the stream is `A`, and the state `S` is updated for the next step process.

For example, let's create a stream of natural numbers using `Stream.unfold`:

```ts twoslash import.meta.vitest name="unfold-1"
import { Stream, Effect } from "effect"

const stream = Stream.unfold(1, (n) => Effect.succeed([n, n + 1] as const))

await Effect.runPromise(Stream.runCollect(stream.pipe(Stream.take(5)))) // => [1, 2, 3, 4, 5]
```

#### Unfolding with Effects

Sometimes, we may need to perform effectful state transformations during the unfolding operation. Since the `step` function passed to `Stream.unfold` already returns an `Effect`, it can depend on any effectful computation, such as generating a random value, while producing the next element and state.

Here's an example of creating an infinite stream of random `1` and `-1` values using `Stream.unfold`:

```ts twoslash import.meta.vitest name="unfoldeffect-1"
import { Stream, Effect, Random } from "effect"

const stream = Stream.unfold(1, (n) =>
  Random.nextBoolean.pipe(
    Effect.map((b) => (b ? ([n, -n] as const) : ([n, n] as const))),
  ),
)

Effect.runPromise(Stream.runCollect(stream.pipe(Stream.take(5)))).then(
  console.log,
)
// Example Output: [ 1, 1, 1, 1, -1 ]

// The sign is random, but the state starts at 1 and only ever flips sign,
// so its absolute value is deterministically always 1
const result = await Effect.runPromise(
  Stream.runCollect(stream.pipe(Stream.take(5))),
)
result.map(Math.abs) // => [1, 1, 1, 1, 1]
```

### Pagination

#### paginate

`Stream.paginate` is similar to `Stream.unfold` but allows emitting values one step further.

For example, the following stream emits `0, 1, 2, 3` elements:

```ts twoslash import.meta.vitest name="paginate-1"
import { Stream, Effect, Option } from "effect"

const stream = Stream.paginate(0, (n) =>
  Effect.succeed([[n], n < 3 ? Option.some(n + 1) : Option.none()] as const),
)

await Effect.runPromise(Stream.runCollect(stream)) // => [0, 1, 2, 3]
```

Here's how it works:

- We start with an initial value of `0`.
- The provided function takes the current value `n` and returns a tuple. The first element of the tuple is the value to emit (`n`), and the second element determines whether to continue (`Option.some(n + 1)`) or stop (`Option.none()`).

### Unfolding vs. Pagination

You might wonder about the difference between the `unfold` and `paginate` combinators and when to use one over the other. `Stream.unfold` produces exactly one value per step, so it can't consume an API whose step naturally returns a batch of values at once. `Stream.paginate` is built for that shape: each step returns an array of values together with the next state, so a single call can emit zero, one, or many elements before deciding whether to continue.

This is exactly the shape of a paginated API. Imagine a `fetchUsers` request that, given a cursor, returns a page of users and, if there's more data, the cursor for the next page:

```ts twoslash import.meta.vitest name="unfolding-vs-pagination-1"
import { Effect, Option, Stream } from "effect"

interface Page<A> {
  readonly items: ReadonlyArray<A>
  readonly nextCursor: number | undefined
}

// A mock paginated API: six users, two per page.
const fetchUsers = (cursor: number): Effect.Effect<Page<string>> => {
  const users = ["Alice", "Bob", "Carol", "Dave", "Erin", "Frank"]
  const pageSize = 2
  const items = users.slice(cursor, cursor + pageSize)
  const nextCursor =
    cursor + pageSize < users.length ? cursor + pageSize : undefined
  return Effect.succeed({ items, nextCursor })
}

const stream = Stream.paginate(0, (cursor) =>
  fetchUsers(cursor).pipe(
    Effect.map(
      (page) => [page.items, Option.fromUndefinedOr(page.nextCursor)] as const,
    ),
  ),
)

await Effect.runPromise(Stream.runCollect(stream)) // => ["Alice", "Bob", "Carol", "Dave", "Erin", "Frank"]
```

Each call to `fetchUsers` hands back a whole page of items, and `Stream.paginate` flattens every page into the resulting stream, stopping once `nextCursor` is `undefined`. Modeling this with `Stream.unfold` would require peeling one item off the current page at a time and keeping the rest around as extra state. `Stream.paginate` already handles that logic by accepting an array per step.

## From Queue and PubSub

In Effect, there are two essential asynchronous messaging data types: [Queue](/docs/v4/concurrency/queue/) and [PubSub](/docs/v4/concurrency/pubsub/). You can easily transform these data types into `Stream`s by utilizing `Stream.fromQueue` and `Stream.fromPubSub`, respectively.

## From Schedule

We can create a stream from a `Schedule` that does not require any further input. The stream will emit an element for each value output from the schedule, continuing for as long as the schedule continues:

```ts twoslash import.meta.vitest name="from-schedule-1"
import { Effect, Stream, Schedule } from "effect"

// Emits values every 100 milliseconds for a total of 10 emissions
const schedule = Schedule.spaced("100 millis").pipe(
  Schedule.upTo({ times: 10 }),
)

const stream = Stream.fromSchedule(schedule)

await Effect.runPromise(Stream.runCollect(stream)) // => [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
```
