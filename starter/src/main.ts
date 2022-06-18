import * as Effect from '@effect/core/io/Effect'
import * as Exit from '@effect/core/io/Exit'

const main = Effect.succeed(() => console.log('hello world'))

Effect.unsafeRunAsyncWith(main, (exit) => {
  if (Exit.isFailure(exit)) {
    console.error(JSON.stringify(exit.cause))
  }
})