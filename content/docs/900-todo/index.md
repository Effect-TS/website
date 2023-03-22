
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
