---
title: Layer Memoization
description: Learn how layer memoization optimizes performance in Effect by reusing layers and controlling their instantiation.
sidebar:
  order: 3
---

import { Aside } from "@astrojs/starlight/components"

Layer memoization allows a layer to be created once and used multiple times in the dependency graph. If we use the same layer twice:

```ts showLineNumbers=false "L1"
Layer.merge(Layer.provide(L2, L1), Layer.provide(L3, L1))
```

then the `L1` layer will be allocated only once.

<Aside type="caution" title="Avoid Duplicate Layer Creation">
  Layers are memoized using **reference equality**. Therefore, if you have a
  layer that is created by calling a function like `f()`, you should _only_ call
  that `f` once and re-use the resulting layer so that you are always using the
  same instance.
</Aside>

## Memoization When Providing Globally

One important feature of an Effect application is that layers are shared by default. This means that if the same layer is used twice, and if we provide the layer globally, the layer will only be allocated a single time. For every layer in our dependency graph, there is only one instance of it that is shared between all the layers that depend on it.

**Example**

For example, assume we have the three services `A`, `B`, and `C`. The implementation of both `B` and `C` is dependent on the `A` service:

```ts twoslash import.meta.vitest name="memoization-when-providing-globally-1"
import { Effect, Context, Layer } from "effect"

class A extends Context.Service<A, { readonly a: number }>()("A") {}

class B extends Context.Service<B, { readonly b: string }>()("B") {}

class C extends Context.Service<C, { readonly c: boolean }>()("C") {}

let initCount = 0

const ALive = Layer.effect(
  A,
  Effect.succeed({ a: 5 }).pipe(
    Effect.tap(() => Effect.log("initialized")),
    Effect.tap(() => Effect.sync(() => initCount++)),
  ),
)

const BLive = Layer.effect(
  B,
  Effect.gen(function* () {
    const { a } = yield* A
    return { b: String(a) }
  }),
)

const CLive = Layer.effect(
  C,
  Effect.gen(function* () {
    const { a } = yield* A
    return { c: a > 0 }
  }),
)

const program = Effect.gen(function* () {
  yield* B
  yield* C
})

const runnable = Effect.provide(
  program,
  Layer.merge(Layer.provide(BLive, ALive), Layer.provide(CLive, ALive)),
)

await Effect.runPromise(runnable)
/*
Output:
timestamp=... level=INFO fiber=#2 message=initialized
*/

// ALive is only built once, no matter how many layers depend on it
initCount // => 1
```

Although both `BLive` and `CLive` layers require the `ALive` layer, the `ALive` layer is instantiated only once. It is shared with both `BLive` and `CLive`.

## Acquiring a Fresh Version

If we don't want to share a module, we should create a fresh, non-shared version of it through `Layer.fresh`.

**Example**

```ts twoslash import.meta.vitest name="acquiring-a-fresh-version-1"
import { Effect, Context, Layer } from "effect"

class A extends Context.Service<A, { readonly a: number }>()("A") {}

class B extends Context.Service<B, { readonly b: string }>()("B") {}

class C extends Context.Service<C, { readonly c: boolean }>()("C") {}

let initCount = 0

const ALive = Layer.effect(
  A,
  Effect.succeed({ a: 5 }).pipe(
    Effect.tap(() => Effect.log("initialized")),
    Effect.tap(() => Effect.sync(() => initCount++)),
  ),
)

const BLive = Layer.effect(
  B,
  Effect.gen(function* () {
    const { a } = yield* A
    return { b: String(a) }
  }),
)

const CLive = Layer.effect(
  C,
  Effect.gen(function* () {
    const { a } = yield* A
    return { c: a > 0 }
  }),
)

const program = Effect.gen(function* () {
  yield* B
  yield* C
})

const runnable = Effect.provide(
  program,
  Layer.merge(
    Layer.provide(BLive, Layer.fresh(ALive)),
    Layer.provide(CLive, Layer.fresh(ALive)),
  ),
)

await Effect.runPromise(runnable)
/*
Output:
timestamp=... level=INFO fiber=#2 message=initialized
timestamp=... level=INFO fiber=#3 message=initialized
*/

// Layer.fresh forces a brand-new (non-shared) instance for each usage
initCount // => 2
```

## No Memoization When Providing Locally

If we don't provide a layer globally but instead provide them locally, that layer doesn't support memoization by default.

**Example**

In the following example, we provided the `ALive` layer two times locally, and Effect doesn't memoize the construction of the `ALive` layer.
So, it will be initialized two times:

```ts twoslash import.meta.vitest name="no-memoization-when-providing-locally-1"
import { Effect, Context, Layer } from "effect"

class A extends Context.Service<A, { readonly a: number }>()("A") {}

let initCount = 0

const ALive = Layer.effect(
  A,
  Effect.succeed({ a: 5 }).pipe(
    Effect.tap(() => Effect.log("initialized")),
    Effect.tap(() => Effect.sync(() => initCount++)),
  ),
)

const program = Effect.gen(function* () {
  yield* Effect.provide(A, ALive)
  yield* Effect.provide(A, ALive)
})

await Effect.runPromise(program)
/*
Output:
timestamp=... level=INFO fiber=#0 message=initialized
timestamp=... level=INFO fiber=#0 message=initialized
*/

// Providing the layer locally rebuilds it every time, so it runs twice
initCount // => 2
```

## Manual Memoization

We can memoize a layer manually using a `Layer.MemoMap`. A `MemoMap` tracks which layers have already been built so that building the same layer again, against the same `MemoMap`, reuses the earlier result instead of re-running its acquisition effect.

Create a `MemoMap` with `Layer.makeMemoMap`, then build a layer into a `Context` with `Layer.buildWithMemoMap`, passing the `MemoMap` and a `Scope`.

**Example**

```ts twoslash import.meta.vitest name="manual-memoization-1"
import { Effect, Context, Layer } from "effect"

class A extends Context.Service<A, { readonly a: number }>()("A") {}

let initCount = 0

const ALive = Layer.effect(
  A,
  Effect.succeed({ a: 5 }).pipe(
    Effect.tap(() => Effect.log("initialized")),
    Effect.tap(() => Effect.sync(() => initCount++)),
  ),
)

const program = Effect.gen(function* () {
  const memoMap = yield* Layer.makeMemoMap
  const scope = yield* Effect.scope

  const context1 = yield* Layer.buildWithMemoMap(ALive, memoMap, scope)
  const context2 = yield* Layer.buildWithMemoMap(ALive, memoMap, scope)

  yield* Effect.provide(A, context1)
  yield* Effect.provide(A, context2)
})

await Effect.runPromise(Effect.scoped(program))
/*
Output:
timestamp=... level=INFO fiber=#1 message=initialized
*/

// Building ALive twice against the same MemoMap reuses the first result
initCount // => 1
```
