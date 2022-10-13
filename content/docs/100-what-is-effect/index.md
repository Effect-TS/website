---
title: What is Effect
---

Pretty much everything interesting that a computer can do is interacting with the outside world.
<br />
Interacting with the outside world is unpredictable, we call programs thst interact with the outside world effectful.
<br />
Effect is a library that gives predictability to such programs by empowering you with a set of composable building blocks to model the patterns that you'll need on a daily basis.
<br />

## Recognising Side Effects

When writing programs in `TypeScript` we are used to code that looks like:

```ts twoslash
function greet(name: string) {
  const greeting = `hello ${name}`
  console.log(greeting)
  return greeting
}
```

When such function is invoked like `greet("Michael")` the message `hello Michael` is printed out in the console.
<br />
Whenever any state external to the function scope is mutated (in this case the console state) a function is said to contain side effects.
<br />
Another way of looking at the same issue is through the lenses of referential transparency, a pure function (a function that doesn't contain side effects) has the property of respecting evaluation substitution, that means if I have something like `f(g(x), g(x))` it is safe to refactor to `const y = g(x); f(y, y);` functions with side effects violate this property, for eameple the following two programs yield different outputs:

```ts twoslash
function program1() {
  console.log(`length: ${combine(greet('Michael'), greet('Michael'))}`)
}
function program2() {
  const x = greet('Michael')
  console.log(`length: ${combine(x, x)}`)
}
function greet(name: string) {
  const greeting = `hello ${name}`
  console.log(greeting)
  return greeting
}
function combine(a: string, b: string) {
  return a + b
}
```

Namely `program1` will print twice the message `hello Michael` and `program2` will print only once.
<br />

Code that contains side effects is hard to maintain, it can't be safely refactored and it's fundamentally hard to write in a safe and fast manner.
<br />

## Programming with Effect

Turning side effects into effects allows you to deal with such programs in a fully safe manner, let's start by writing the same program with `Effect`.

```ts twoslash
import * as E from '@effect/core/io/Effect'
import { pipe } from '@tsplus/stdlib/data/Function'

const greet = (name: string) =>
  pipe(
    E.succeed(`hello ${name}`),
    E.tap((greeting) => E.logInfo(greeting)),
  )

const combine = (a: E.Effect<never, never, string>, b: E.Effect<never, never, string>) =>
  pipe(
    a,
    E.zipWith(b, (a, b) => a + b),
  )

const program1 = E.suspendSucceed(() => combine(greet('Michael'), greet('Michael')))

const program2 = E.suspendSucceed(() => {
  const name = greet('Michael')
  return combine(name, name)
})
```

When executed the result of `program1` and the one of `program2` will be exactly the same, namely twice the message `hello Michael` will be printed out in the console.
<br />

## Executing Effects

Effects can execute in various ways, the simplest is the execution to a `Promise<Value>` that may be used for interop purposes.

```ts twoslash
import * as E from '@effect/core/io/Effect'
import { pipe } from '@tsplus/stdlib/data/Function'

const program = pipe(E.logInfo('Hello'), E.zipRight(E.logInfo('World')))

E.unsafeRunPromise(program)
  .then(() => {
    console.log('Execution Completed')
  })
  .catch(() => {
    console.log('Execution Failed')
  })
```
