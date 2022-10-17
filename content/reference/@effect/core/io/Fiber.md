## Fiber

A fiber is a lightweight thread of execution that never consumes more than a
whole thread (but may consume much less, depending on contention and
asynchronicity). Fibers are spawned by forking ZIO effects, which run
concurrently with the parent effect.

Fibers can be joined, yielding their result to other fibers, or interrupted,
which terminates the fiber, safely releasing all resources.

```ts
export interface Fiber<E, A> {
    readonly [FiberSym]: FiberSym;
    readonly [_E]: () => E;
    readonly [_A]: () => A;
}
```

## General API

### as

Maps the output of this fiber to the specified constant value.

```ts
export declare const as: <B>(b: B) => <E, A>(self: Fiber<E, A>) => Fiber<E, B>;
```

### await

```ts
export declare const await: <E, A>(self: Fiber<E, A>) => Effect<never, never, Exit<E, A>>;
```

### awaitAll

Awaits on all fibers to be completed, successfully or not.

```ts
export declare const awaitAll: (fibers: Collection<Fiber<any, any>>) => Effect<never, never, void>;
```

### children

Retrieves the immediate children of the fiber.

```ts
export declare const children: <E, A>(self: Fiber<E, A>) => Effect<never, never, Chunk<Runtime<any, any>>>;
```

### collectAll

Collects all fibers into a single fiber producing an in-order list of the
results.

```ts
export declare const collectAll: <E, A>(fibers: Collection<Fiber<E, A>>) => Fiber<E, Chunk<A>>;
```

### done

A fiber that is done with the specified `Exit` value.

```ts
export declare const done: <E, A>(exit: Exit<E, A>) => Fiber<E, A>;
```

### fail

A fiber that has already failed with the specified value.

```ts
export declare const fail: <E>(e: E) => Fiber<E, never>;
```

### failCause

Creates a `Fiber` that has already failed with the specified cause.

```ts
export declare const failCause: <E>(cause: Cause<E>) => Fiber<E, never>;
```

### fold

Folds over the runtime or synthetic fiber.

```ts
export declare const fold: <E, A, Z>(onRuntime: (_: Runtime<E, A>) => Z, onSynthetic: (_: Synthetic<E, A>) => Z) => (self: Fiber<E, A>) => Z;
```

### fromEffect

Lifts an `Effect` into a `Fiber`.

```ts
export declare const fromEffect: <E, A>(effect: Effect<never, E, A>) => Effect<never, never, Fiber<E, A>>;
```

### id

The identity of the fiber.

```ts
export declare const id: <E, A>(self: Fiber<E, A>) => FiberId;
```

### inheritAll

Inherits values from all `FiberRef` instances into current fiber. This
will resume immediately.

```ts
export declare const inheritAll: <E, A>(self: Fiber<E, A>) => Effect<never, never, void>;
```

### interrupt

Interrupts the fiber from whichever fiber is calling this method. If the
fiber has already exited, the returned effect will resume immediately.
Otherwise, the effect will resume when the fiber exits.

```ts
export declare const interrupt: <E, A>(self: Fiber<E, A>) => Effect<never, never, Exit<E, A>>;
```

### interruptAll

Interrupts all fibers, awaiting their interruption.

```ts
export declare const interruptAll: (fibers: Collection<Fiber<any, any>>) => Effect<never, never, void>;
```

### interruptAllAs

Interrupts all fibers as by the specified fiber, awaiting their
interruption.

```ts
export declare const interruptAllAs: (fibers: Collection<Fiber<any, any>>, fiberId: FiberId) => Effect<never, never, void>;
```

### interruptAs

A fiber that is already interrupted.

```ts
export declare const interruptAs: (fiberId: FiberId) => Fiber<never, never>;
```

### interruptAsFork

Interrupts the fiber as if interrupted from the specified fiber. If the
fiber has already exited, the returned effect will resume immediately.
Otherwise, the effect will resume when the fiber exits.

```ts
export declare const interruptAsFork: (fiberId: FiberId) => <E, A>(self: Fiber<E, A>) => Effect<never, never, void>;
```

### interruptAsNow

Interrupts the fiber as if interrupted from the specified fiber. If the
fiber has already exited, the returned effect will resume immediately.
Otherwise, the effect will resume when the fiber exits.

```ts
export declare const interruptAsNow: (fiberId: FiberId) => <E, A>(self: Fiber<E, A>) => Effect<never, never, Exit<E, A>>;
```

### interruptFork

Interrupts the fiber from whichever fiber is calling this method. The
interruption will happen in a separate daemon fiber, and the returned
effect will always resume immediately without waiting.

```ts
export declare const interruptFork: <E, A>(self: Fiber<E, A>) => Effect<never, never, void>;
```

### isFiberStatus

```ts
export declare const isFiberStatus: (u: unknown) => u is FiberStatus;
```

### join

Joins the fiber, which suspends the joining fiber until the result of the
fiber has been determined. Attempting to join a fiber that has erred will
result in a catchable error. Joining an interrupted fiber will result in an
"inner interruption" of this fiber, unlike interruption triggered by
another fiber, "inner interruption" can be caught and recovered.

```ts
export declare const join: <E, A>(self: Fiber<E, A>) => Effect<never, E, A>;
```

### joinAll

Joins all fibers, awaiting their _successful_ completion. Attempting to
join a fiber that has erred will result in a catchable error, _if_ that
error does not result from interruption.

```ts
export declare const joinAll: <E, A>(fibers: Collection<Fiber<E, A>>) => Effect<never, E, void>;
```

### makeSynthetic

```ts
export declare const makeSynthetic: <E, A>(_: { readonly id: FiberId; readonly await: Effect<never, never, Exit<E, A>>; readonly children: Effect<never, never, Chunk<Runtime<any, any>>>; readonly inheritAll: Effect<never, never, void>; readonly poll: Effect<never, never, Maybe<Exit<E, A>>>; readonly interruptAsFork: (fiberId: FiberId) => Effect<never, never, void>; }) => Fiber<E, A>;
```

### map

Maps over the value the Fiber computes.

```ts
export declare const map: <A, B>(f: (a: A) => B) => <E>(self: Fiber<E, A>) => Fiber<E, B>;
```

### mapEffect

Effectually maps over the value the fiber computes.

```ts
export declare const mapEffect: <A, E2, A2>(f: (a: A) => Effect<never, E2, A2>) => <E>(self: Fiber<E, A>) => Fiber<E2 | E, A2>;
```

### mapFiber

Passes the success of this fiber to the specified callback, and continues
with the fiber that it returns.

```ts
export declare const mapFiber: <E, E1, A, B>(f: (a: A) => Fiber<E1, B>) => (self: Fiber<E, A>) => Effect<never, never, Fiber<E | E1, B>>;
```

### never

A fiber that never fails or succeeds.

```ts
export declare const never: Fiber<never, never>;
```

### orElse

Returns a fiber that prefers `this` fiber, but falls back to the `that` one
when `this` one fails. Interrupting the returned fiber will interrupt both
fibers, sequentially, from left to right.

```ts
export declare const orElse: <E2, A2>(that: Fiber<E2, A2>) => <E, A>(self: Fiber<E, A>) => Fiber<E2 | E, A2 | A>;
```

### orElseEither

Returns a fiber that prefers `this` fiber, but falls back to the `that` one
when `this` one fails. Interrupting the returned fiber will interrupt both
fibers, sequentially, from left to right.

```ts
export declare const orElseEither: <E2, A2>(that: LazyArg<Fiber<E2, A2>>) => <E, A>(self: Fiber<E, A>) => Fiber<E2 | E, Either<A, A2>>;
```

### ordFiber

```ts
export declare const ordFiber: Ord<Runtime<unknown, unknown>>;
```

### poll

Tentatively observes the fiber, but returns immediately if it is not
already done.

```ts
export declare const poll: <E, A>(self: Fiber<E, A>) => Effect<never, never, Maybe<Exit<E, A>>>;
```

### realFiber

```ts
export declare const realFiber: <E, A>(fiber: Fiber<E, A>) => asserts fiber is RealFiber<E, A>;
```

### roots

Returns a chunk containing all root fibers. Due to concurrency, the
returned chunk is only weakly consistent.

```ts
export declare const roots: Effect<never, never, Chunk<Runtime<any, any>>>;
```

### scoped

Converts this fiber into a scoped effect. The fiber is interrupted when the
scope is closed.

```ts
export declare const scoped: <E, A>(self: Fiber<E, A>) => Effect<Scope, never, Fiber<E, A>>;
```

### succeed

Returns a fiber that has already succeeded with the specified value.

```ts
export declare const succeed: <A>(a: A) => Fiber<never, A>;
```

### unifyFiber

```ts
export declare const unifyFiber: <X extends Fiber<any, any>>(self: X) => Fiber<[X] extends [{ [_E]: () => infer E; }] ? E : never, [X] extends [{ [_A]: () => infer A; }] ? A : never>;
```

### unit

A fiber that has already succeeded with unit.

```ts
export declare const unit: Fiber<never, void>;
```

### zip

Zips this fiber and the specified fiber together, producing a tuple of
their output.

```ts
export declare const zip: <E2, A2>(that: Fiber<E2, A2>) => <E, A>(self: Fiber<E, A>) => Fiber<E2 | E, readonly [A, A2]>;
```

### zipLeft

Same as `zip` but discards the output of the right hand side.

```ts
export declare const zipLeft: <E2, A2>(that: Fiber<E2, A2>) => <E, A>(self: Fiber<E, A>) => Fiber<E2 | E, A>;
```

### zipRight

Same as `zip` but discards the output of the left hand side.

```ts
export declare const zipRight: <E2, A2>(that: Fiber<E2, A2>) => <E, A>(self: Fiber<E, A>) => Fiber<E2 | E, A2>;
```

### zipWith

Zips this fiber with the specified fiber, combining their results using the
specified combiner function. Both joins and interruptions are performed in
sequential order from left to right.

```ts
export declare const zipWith: <E2, A, B, C>(that: Fiber<E2, B>, f: (a: A, b: B) => C) => <E>(self: Fiber<E, A>) => Fiber<E2 | E, C>;
```

