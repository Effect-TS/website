## The Effect Module

In the first 2 parts of the series we have looked at the overall module structure of `@effect-ts/core` and discussed the general aspects of how modules are organised.

We will now take a deep dive into the specific of the `@effect-ts/core/Effect` segment, the primary target for the modules that we will discuss today is `node.js` and in general backend development.

While the technologies in question are perfectly usable in the frontend space we believe most of the features are overkill if used on top of pre-existing frameworks like `react` and that within the `@effect-ts/core` system there are more appropriate data types like  `Async` & `Sync` and in general the ones available in the `@effect-ts/core/Classic` segment that better fit the requirements.

In general the advise will be to use `Effect` and its derivative in frontend development only if major usage is involved and the bundle-size vs feature-set make sense for you (`Effect` and its derivatives tend to add a minimum of `30-80k`), for example we have seen very successful integrations of `Stream` with a redux epic-inspired design but we have also seen adding `50k` to the bundle to simply have interruption on a `Promise` (that would be something to avoid).

What we will discuss today (and in the next few articles of the series) in most parts is directly usable across all the data types that implements instances of `Environmental` thanks to the approach discussed in the previous posts.

Let's start with the basic and let's take a look at the type definition.

```ts
type Effect<R, E, A> = omitted.
```

the real definition of `Effect` is omitted from the purpose of this discussion because the reality is you have no reasons in the world to ever look inside of it.

The logical definition that we can think of is in the lines of:

```ts
type Effect<R, E, A> = (r: R) => () => Promise<Either<E, A>>
```

Basically the `Effect` type describes a computation that, in order to run requires an argument of type `R` to be provided and when the computation `runs` and `completes` will produce a result that can `either` be a failure of type `E` or a success of type `A`.

In reality the implementation uses a different internal representation and makes usage of fibers to represent concurrent computations and additionally has an `unchecked` exception channel to signal defects of code or unexpected exceptions, the `Effect` type uses `Cause` to represent the error case of the `Exit` and `Cause` allows for tracking multiple exit causes with different methods (like parallel/sequential cause of failures, interruptions, etc).

Let's take a look at a basic usage of all the parameters:

```ts
import * as T from "@effect-ts/core/Effect"
import { pipe } from "@effect-ts/core/Function"
import { runMain } from "@effect-ts/node/Runtime"

interface Input {
  x: number
  y: number
}

const division = pipe(
  T.environment<Input>(),
  T.chain(({ x, y }) => (y === 0 ? T.fail("division by zero") : T.succeed(x / y))),
  T.chain((result) =>
    T.effectTotal(() => {
      console.log(`Final result: ${result}`)
    })
  )
)

pipe(division, T.provideAll({ x: 1, y: 2 }), runMain)
```

If we highlight on the type of division:
![Screenshot 2020-10-11 131415](https://dev-to-uploads.s3.amazonaws.com/i/4uu24f7wed0bqif2ia97.png)
 
We can easily read that in order to run this computation we will be required to provide an argument of type `Input` and we can expect either an error of type `string` or a success of type `void` (nothing basically).

In the last line of the snippet we proceed to run the program with:

```ts
pipe(division, T.provideAll({ x: 1, y: 2 }), runMain)
```

If we remove `T.provideAll({ x: 1, y: 2 })` we will be alerted with a compiler error that state `Input` is not assignable to `DefaultEnv` that translates to: "you need to give Input otherwise I have no idea what to run".

If we run the computation with `y = 0` we will get:

```
A checked error was not handled.
"division by zero"
```

Using `runMain` we have automatic reporting of errors in a `prettified format` (we will take a look at a larger report later), additionally `runMain` returns a function that when called will cancel the running computation.

## Snippets Location
All the snippets in this article are available at: [https://github.com/Matechs-Garage/effect-ts-bootstrap/tree/master/articles/effect](https://github.com/Matechs-Garage/effect-ts-bootstrap/tree/master/articles/effect)

In the repository you find also a playground environment that bootstrap a postgresql, runs migrations and implements a basic persistence module with detailed integration tests some of which using arbitrary generated models (property-based), we will cover those aspects in future articles.

## Variance
Like we discussed in the previous articles of the series `variance` is a key component in the design of the modules of `@effect-ts/core` in the case of `Effect` we discussed 3 type parameters `R, E, A` representing one input `R` one possible error (output) `E` and one possible output `A`. 

In mostly all of the available combinators `E` is treated as `co-variant` and `R` is treated as `contra-variant`, this means that, by default, mixing different `Effect`s the result will be an `Effect` that requires `R1 & R2` and can fail for `E1 | E2`.

Let's see it in practice:

```ts
import * as T from "@effect-ts/core/Effect"
import { pipe } from "@effect-ts/core/Function"
import { runMain } from "@effect-ts/node/Runtime"

interface InputA {
  x: number
}
interface InputB {
  y: number
}
interface ErrorA {
  _tag: "ErrorA"
  value: string
}
interface ErrorB {
  _tag: "ErrorB"
  value: string
}

// T.Effect<InputA & InputB, ErrorA | ErrorB, void>
const program = pipe(
  T.access((_: InputA) => _.x),
  T.chain((n) =>
    n === 0 ? T.fail<ErrorA>({ _tag: "ErrorA", value: "n === 0" }) : T.succeed(n)
  ),
  T.chain((n) => T.access((_: InputB) => _.y + n)),
  T.chain((n) =>
    n === 10 ? T.fail<ErrorB>({ _tag: "ErrorB", value: "n === 10" }) : T.succeed(n)
  ),
  T.chain((n) =>
    T.effectTotal(() => {
      console.log(n)
    })
  )
)

pipe(program, T.provideAll({ x: 1, y: 1 }), runMain)
```

## Handling Checked Errors
In the previous example we used a tagged union to represent the error type, that choice was purposely made because of typescript's ability to automatically discriminate over the members of such union.

Let's see for example how we could handle the `ErrorA` case of the program above:

```ts
import * as T from "@effect-ts/core/Effect"
import { pipe } from "@effect-ts/core/Function"
import { runMain } from "@effect-ts/node/Runtime"

interface InputA {
  x: number
}
interface InputB {
  y: number
}
interface ErrorA {
  _tag: "ErrorA"
  value: string
}
interface ErrorB {
  _tag: "ErrorB"
  value: string
}

// T.Effect<InputA & InputB, ErrorA | ErrorB, void>
const program = pipe(
  T.access((_: InputA) => _.x),
  T.chain((n) =>
    n === 0 ? T.fail<ErrorA>({ _tag: "ErrorA", value: "n === 0" }) : T.succeed(n)
  ),
  T.chain((n) => T.access((_: InputB) => _.y + n)),
  T.chain((n) =>
    n === 10 ? T.fail<ErrorB>({ _tag: "ErrorB", value: "n === 10" }) : T.succeed(n)
  ),
  T.chain((n) =>
    T.effectTotal(() => {
      console.log(n)
    })
  )
)

// T.Effect<InputA & InputB, ErrorB, void>
const programAfterErrorHandling = pipe(
  program,
  T.catchAll((error) => {
    switch (error._tag) {
      case "ErrorA": {
        return T.effectTotal(() => {
          console.log(`handling ErrorA: ${error.value}`)
        })
      }
      default:
        return T.fail(error)
    }
  })
)

pipe(programAfterErrorHandling, T.provideAll({ x: 1, y: 1 }), runMain)
```

If you use this standard for errors and tagged unions in general you can leverage the `pattern & matchTag` utilities of `@effect-ts/core/Utils` and rewrite the above as:

```ts
import * as T from "@effect-ts/core/Effect"
import { pipe } from "@effect-ts/core/Function"
import { matchTag } from "@effect-ts/core/Utils"
import { runMain } from "@effect-ts/node/Runtime"

interface InputA {
  x: number
}
interface InputB {
  y: number
}
interface ErrorA {
  _tag: "ErrorA"
  value: string
}
interface ErrorB {
  _tag: "ErrorB"
  value: string
}

// T.Effect<InputA & InputB, ErrorA | ErrorB, void>
const program = pipe(
  T.access((_: InputA) => _.x),
  T.chain((n) =>
    n === 0 ? T.fail<ErrorA>({ _tag: "ErrorA", value: "n === 0" }) : T.succeed(n)
  ),
  T.chain((n) => T.access((_: InputB) => _.y + n)),
  T.chain((n) =>
    n === 10 ? T.fail<ErrorB>({ _tag: "ErrorB", value: "n === 10" }) : T.succeed(n)
  ),
  T.chain((n) =>
    T.effectTotal(() => {
      console.log(n)
    })
  )
)

// T.Effect<InputA & InputB, ErrorB, void>
const programAfterErrorHandling = pipe(
  program,
  T.catchAll(
    matchTag(
      {
        ErrorA: ({ value }) =>
          T.effectTotal(() => {
            console.log(`handling ErrorA: ${value}`)
          })
      },
      T.fail
    )
  )
)

pipe(programAfterErrorHandling, T.provideAll({ x: 1, y: 1 }), runMain)
``` 

## Unchecked Exceptions
So far we've seen how to raise checked errors that have specific types and are safely represented for the type-checker to process, there are cases where instead we want to raise some stronger form of error, for example to handle cases like a code defect or cases where unknown system errors have been observed, to do so `Effect` provides a dedicated `Error` channel.

Note that raising on this channel will skip any checked error management process like the above `T.catchAll`.

Let's make an example:

```ts
import * as T from "@effect-ts/core/Effect"
import { pipe } from "@effect-ts/core/Function"
import { matchTag } from "@effect-ts/core/Utils"
import { runMain } from "@effect-ts/node/Runtime"

interface InputA {
  x: number
}
interface InputB {
  y: number
}
interface ErrorA {
  _tag: "ErrorA"
  value: string
}

// T.Effect<InputA & InputB, ErrorA, void>
const program = pipe(
  T.access((_: InputA) => _.x),
  T.chain((n) =>
    n === 0 ? T.fail<ErrorA>({ _tag: "ErrorA", value: "n === 0" }) : T.succeed(n)
  ),
  T.chain((n) => T.access((_: InputB) => _.y + n)),
  T.chain((n) => (n === 10 ? T.die("something very wrong happened") : T.succeed(n))),
  T.chain((n) =>
    T.effectTotal(() => {
      console.log(n)
    })
  )
)

// T.Effect<InputA & InputB, never, void>
const programAfterErrorHandling = pipe(
  program,
  T.catchAll(
    matchTag(
      {
        ErrorA: ({ value }) =>
          T.effectTotal(() => {
            console.log(`handling ErrorA: ${value}`)
          })
      },
      (e) =>
        pipe(
          T.effectTotal(() => {
            console.log(`Default Handler`)
          }),
          T.andThen(T.fail(e))
        )
    )
  )
)

pipe(programAfterErrorHandling, T.provideAll({ x: 1, y: 9 }), runMain)
```

By running the code above we will get:

```bash
yarn ts-node articles/effect/04.ts 
yarn run v1.22.4
$ /home/ma/os/articles/node_modules/.bin/ts-node articles/effect/04.ts
An unchecked error was produced.
"something very wrong happened"
error Command failed with exit code 2.
```

We can notice none of the error handling logic have been accounted for, in fact neither `console.log` cases of the `T.catchAll` logic have been produced.

## Handling full Cause
In order to take control over the full exit cause of a program it is necessary to access lower level combinators like `foldCause` or a combination of `sandbox/catchAll`.

Let's take a look at a possibility:

```ts
import * as A from "@effect-ts/core/Classic/Array"
import * as T from "@effect-ts/core/Effect"
import * as Cause from "@effect-ts/core/Effect/Cause"
import { pipe } from "@effect-ts/core/Function"
import { matchTag } from "@effect-ts/core/Utils"
import { runMain } from "@effect-ts/node/Runtime"

interface InputA {
  x: number
}
interface InputB {
  y: number
}
interface ErrorA {
  _tag: "ErrorA"
  value: string
}

// T.Effect<InputA & InputB, ErrorA, void>
const program = pipe(
  T.access((_: InputA) => _.x),
  T.chain((n) =>
    n === 0 ? T.fail<ErrorA>({ _tag: "ErrorA", value: "n === 0" }) : T.succeed(n)
  ),
  T.chain((n) => T.access((_: InputB) => _.y + n)),
  T.chain((n) => (n === 10 ? T.die("something very wrong happened") : T.succeed(n))),
  T.chain((n) =>
    T.effectTotal(() => {
      console.log(n)
    })
  )
)

// T.Effect<InputA & InputB, never, void>
const programAfterErrorHandling = pipe(
  program,
  T.catchAll(
    matchTag(
      {
        ErrorA: ({ value }) =>
          T.effectTotal(() => {
            console.log(`handling ErrorA: ${value}`)
          })
      },
      (e) =>
        pipe(
          T.effectTotal(() => {
            console.log(`Default Handler`)
          }),
          T.andThen(T.fail(e))
        )
    )
  )
)

const handleFullCause = pipe(
  programAfterErrorHandling,
  T.sandbox,
  T.catchAll((cause) => {
    const defects = Cause.defects(cause)

    if (A.isNonEmpty(defects)) {
      return T.effectTotal(() => {
        console.log("Handle:", ...defects)
      })
    }

    return T.halt(cause)
  })
)

pipe(handleFullCause, T.provideAll({ x: 1, y: 9 }), runMain)
```

With the combinator `Cause.defects` we can extract a list of defects that might be present on the cause, there are many more combinators you can use to encode the many possible scenarios you might need to handle.

The type definition `Cause` is as follows:

```ts
export type Cause<E> = Empty | Fail<E> | Die | Interrupt | Then<E> | Both<E>

// empty cause, no cause at all, used for monoidal composition
export interface Empty {
  readonly _tag: "Empty"
}

// represent a checked error
export interface Fail<E> {
  readonly _tag: "Fail"
  readonly value: E
}

// represent an unchecked error
export interface Die {
  readonly _tag: "Die"
  readonly value: unknown
}

// represent an interruption triggered by fiber with id FiberID
export interface Interrupt {
  readonly _tag: "Interrupt"
  readonly fiberId: FiberID
}

// represent two causes that happened in sequence
export interface Then<E> {
  readonly _tag: "Then"
  readonly left: Cause<E>
  readonly right: Cause<E>
}

// represent two causes that happened in parallel
export interface Both<E> {
  readonly _tag: "Both"
  readonly left: Cause<E>
  readonly right: Cause<E>
}
```

Let's take a look at a more complex code where we might trigger multiple failures and let's take a look at how it gets reported:

```ts
import * as T from "@effect-ts/core/Effect"
import * as Rand from "@effect-ts/core/Effect/Random"
import { pipe } from "@effect-ts/core/Function"
import { runMain } from "@effect-ts/node/Runtime"

export class ProcessError {
  readonly _tag = "ProcessError"
  constructor(readonly message: string) {}
}

// this effect sleeps for a random period between 100ms and 1000ms and randomly suceed or fail
export const randomFailure = (n: number) =>
  pipe(
    Rand.nextIntBetween(100, 1000),
    T.chain((delay) =>
      pipe(
        Rand.nextBoolean,
        T.chain((b) => (b ? T.unit : T.fail(new ProcessError(`failed at: ${n}`)))),
        T.delay(delay)
      )
    )
  )

// build up a n-tuple of computations
export const program = T.tuplePar(
  randomFailure(0),
  randomFailure(1),
  randomFailure(2),
  randomFailure(3),
  randomFailure(4),
  randomFailure(5)
)

// runs the program
pipe(program, runMain)
```

Running this various times will produce different outputs given the random nature of the program but an average result will look like:

```bash
$ /home/ma/os/articles/node_modules/.bin/ts-node articles/effect/06.ts
╥
╠══╦══╦══╦══╦══╗
║  ║  ║  ║  ║  ║
║  ║  ║  ║  ║  ╠─An interrupt was produced by #6.
║  ║  ║  ║  ║  ▼
║  ║  ║  ║  ║
║  ║  ║  ║  ╠─An interrupt was produced by #5.
║  ║  ║  ║  ▼
║  ║  ║  ║
║  ║  ║  ╠─An interrupt was produced by #4.
║  ║  ║  ▼
║  ║  ║
║  ║  ╠─An interrupt was produced by #1.
║  ║  ▼
║  ║
║  ╠─A checked error was not handled.
║  ║ {
║  ║   "message": "failed at: 1",
║  ║   "_tag": "ProcessError"
║  ║ }
║  ▼
▼
error Command failed with exit code 2.
``` 

We can see that at the first failure the `tuplePar` combinator takes care of interrupting the other running computations and we can see by the horizontal nature of the report that there were running 6 fibers in total.

Let's take a look at how error handling applies in this scenarios:

```ts
import * as T from "@effect-ts/core/Effect"
import * as Rand from "@effect-ts/core/Effect/Random"
import { pipe } from "@effect-ts/core/Function"
import { runMain } from "@effect-ts/node/Runtime"

export class ProcessError {
  readonly _tag = "ProcessError"
  constructor(readonly message: string) {}
}

// this effect sleeps for a random period between 100ms and 1000ms and randomly suceed or fail
export const randomFailure = (n: number) =>
  pipe(
    Rand.nextIntBetween(100, 1000),
    T.chain((delay) =>
      pipe(
        Rand.nextBoolean,
        T.chain((b) => (b ? T.unit : T.fail(new ProcessError(`failed at: ${n}`)))),
        T.delay(delay)
      )
    )
  )

// build up a n-tuple of computations
export const program = T.tuplePar(
  randomFailure(0),
  randomFailure(1),
  randomFailure(2),
  randomFailure(3),
  randomFailure(4),
  randomFailure(5)
)

// runs the program
pipe(
  program,
  T.catchAll((_) =>
    T.effectTotal(() => {
      console.log(`Process error: ${_.message}`)
    })
  ),
  runMain
)
```

This will now emit something like:

```bash
$ /home/ma/os/articles/node_modules/.bin/ts-node articles/effect/07.ts
Process error: failed at: 2
Done in 2.12s.
```

We can see that `catchAll` peaks at the first available `checked` error in the `cause` tree and handles that.

In order to handle multiple causes of failures we can, as outlined before, jump in a sandbox and traverse the `cause` with available combinators like `collect` and similar. 

## Environment
We have covered up to now the usage of `E` and `A`, let's now take a deep look at how `R` works.

The crucial idea we will discuss here is I believe the single 10x improvement ZIO had to offer to the scala ecosystem and it applies perfectly (even more compared to scala) to the structural variance of typescript.

The main idea is to embed dynamic services that contains business logic as part of the environment having as a consequence a type-level representation of what modules a specific computation needs in order to run, for example in previous snippets we have interacted directly with `console.log`, that code will easily become non testable without weird tricks like monkey-patching modules.

Let's start with the basic:

```ts
import * as T from "@effect-ts/core/Effect"
import { pipe } from "@effect-ts/core/Function"
import { runMain } from "@effect-ts/node/Runtime"

// define a module
export interface ConsoleModule {
  log: (message: string) => T.UIO<void>
}

// access the module from environment
export function log(message: string) {
  return T.accessM((_: ConsoleModule) => _.log(message))
}

// T.Effect<ConsoleModule, never, void>
export const program = pipe(
  log("hello"),
  T.andThen(log("world")),
  T.andThen(log("hello")),
  T.andThen(log("eatrh"))
)

// Run the program providing a concrete implementation
pipe(
  program,
  T.provide<ConsoleModule>({
    log: (message) =>
      T.effectTotal(() => {
        console.log(message)
      })
  }),
  runMain
)
```

When executed this program will output:

```bash
$ /home/ma/os/articles/node_modules/.bin/ts-node articles/effect/08.ts
hello
world
hello
eatrh
Done in 1.68s.
```

We can now provide a different implementation that we might use to test the correct implementation of program without output to console, for example:

```ts
import * as T from "@effect-ts/core/Effect"
import * as R from "@effect-ts/core/Effect/Ref"
import { pipe } from "@effect-ts/core/Function"
import { runMain } from "@effect-ts/node/Runtime"

// define a module
export interface ConsoleModule {
  log: (message: string) => T.UIO<void>
}

// access the module from environment
export function log(message: string) {
  return T.accessM((_: ConsoleModule) => _.log(message))
}

// T.Effect<ConsoleModule, never, void>
export const program = pipe(
  log("hello"),
  T.andThen(log("world")),
  T.andThen(log("hello")),
  T.andThen(log("eatrh"))
)

// Run the program providing a concrete implementation
pipe(
  T.do,
  T.bind("ref", () => R.makeRef(<string[]>[])),
  T.bind("prog", ({ ref }) =>
    pipe(
      program,
      T.provide<ConsoleModule>({
        log: (message) =>
          pipe(
            ref,
            R.update((messages) => [...messages, message])
          )
      })
    )
  ),
  T.chain(({ ref }) => ref.get),
  T.tap((messages) =>
    messages.length === 4 ? T.succeed(messages) : T.fail("wrong number of messages")
  ),
  runMain
)
```

In this way we can run the program without ever interacting with the actual `console`.

## Has & Tag
It's all nice but at some point we will encounter strange situations, the intersection of 2 types is not generally commutative and can lead to very strange behaviours. 

One example would be having 2 services implement the `log` function with different signatures, those will be collapsed to `never` when `ServiceA & ServiceB` are present, additionally inference cannot always discern those members from the mangled result, we need to remember, at the end, that the typescript type-system is structural.

Here comes `Has` and `Tag` to solve the issue, `Tag<T>` represent an object that has the ability to read and write from and to and environment of type `Has<T>`, `Has` is designed to be safe for intersection.

Let's rewrite the above using `Has` and `Tag`:

```ts
import { tag } from "@effect-ts/core/Classic/Has"
import * as T from "@effect-ts/core/Effect"
import { pipe } from "@effect-ts/core/Function"
import { runMain } from "@effect-ts/node/Runtime"

// define a module
export interface ConsoleModule {
  log: (message: string) => T.UIO<void>
}

// define a tag for the service
export const ConsoleModule = tag<ConsoleModule>()

// access the module from environment
export function log(message: string) {
  return T.accessServiceM(ConsoleModule)((_) => _.log(message))
}

// T.Effect<Has<ConsoleModule>, never, void>
export const program = pipe(
  log("hello"),
  T.andThen(log("world")),
  T.andThen(log("hello")),
  T.andThen(log("eatrh"))
)

// Run the program providing a concrete implementation
pipe(
  program,
  T.provideService(ConsoleModule)({
    log: (message) =>
      T.effectTotal(() => {
        console.log(message)
      })
  }),
  runMain
)
```

There are many combinators to work with services (provide, access, replace, etc). 

Services are also highly used in structuring modular environments constructed dynamically using `Layer` but that discussion is for another post of the series, after having seen the `Managed` data type first.

We can already improve the code a little by deriving the implementation of `log`, to do so we can look at `deriveLifted`:

```ts
import { tag } from "@effect-ts/core/Classic/Has"
import * as T from "@effect-ts/core/Effect"
import { pipe } from "@effect-ts/core/Function"
import { runMain } from "@effect-ts/node/Runtime"

// define a module
export interface ConsoleModule {
  log: (message: string) => T.UIO<void>
}

// define a tag for the service
export const ConsoleModule = tag<ConsoleModule>()

// access the module from environment
export const { log } = T.deriveLifted(ConsoleModule)(["log"], [], [])

// T.Effect<Has<ConsoleModule>, never, void>
export const program = pipe(
  log("hello"),
  T.andThen(log("world")),
  T.andThen(log("hello")),
  T.andThen(log("eatrh"))
)

// Run the program providing a concrete implementation
pipe(
  program,
  T.provideService(ConsoleModule)({
    log: (message) =>
      T.effectTotal(() => {
        console.log(message)
      })
  }),
  runMain
)
```

The 3 array parameters of `deriveLifted` represent the field names of the functions to derive and they represent in sequence: 
1. non generic, effect-returning functions
2. constant effects
3. constant values 

Usage:

```ts
import { tag } from "@effect-ts/core/Classic/Has"
import * as T from "@effect-ts/core/Effect"
import { pipe } from "@effect-ts/core/Function"
import { runMain } from "@effect-ts/node/Runtime"

// define a module
export interface ConsoleModule {
  prefix: T.UIO<string>
  end: string
  log: (message: string) => T.UIO<void>
}

// define a tag for the service
export const ConsoleModule = tag<ConsoleModule>()

// access the module from environment
export const { end, log, prefix } = T.deriveLifted(ConsoleModule)(
  ["log"],
  ["prefix"],
  ["end"]
)

// T.Effect<Has<ConsoleModule>, never, void>
export const program = pipe(
  prefix,
  T.chain(log),
  T.andThen(log("world")),
  T.andThen(log("hello")),
  T.andThen(pipe(end, T.chain(log)))
)

// Run the program providing a concrete implementation
pipe(
  program,
  T.provideService(ConsoleModule)({
    log: (message) =>
      T.effectTotal(() => {
        console.log(message)
      }),
    prefix: T.succeed("hello"),
    end: "earth"
  }),
  runMain
)
```

Additional combinators like `deriveAccess` and `deriveAccessM` can be used to derive access-like function signatures like:

```ts
import { tag } from "@effect-ts/core/Classic/Has"
import * as T from "@effect-ts/core/Effect"
import { pipe } from "@effect-ts/core/Function"
import { runMain } from "@effect-ts/node/Runtime"

// define a module
export interface ConsoleModule {
  prefix: string
  end: string
  log: (message: string) => T.UIO<void>
}

// define a tag for the service
export const ConsoleModule = tag<ConsoleModule>()

// access the module from environment
export const { log } = T.deriveLifted(ConsoleModule)(["log"], [], [])

export const { end: accessEndM, prefix: accessPrefixM } = T.deriveAccessM(
  ConsoleModule
)(["end", "prefix"])

// T.Effect<Has<ConsoleModule>, never, void>
export const program = pipe(
  accessPrefixM(log),
  T.andThen(log("world")),
  T.andThen(log("hello")),
  T.andThen(accessEndM(log))
)

// Run the program providing a concrete implementation
pipe(
  program,
  T.provideService(ConsoleModule)({
    log: (message) =>
      T.effectTotal(() => {
        console.log(message)
      }),
    prefix: "hello",
    end: "earth"
  }),
  runMain
)
```
