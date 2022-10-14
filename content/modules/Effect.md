## Effect

Reference Documentation for the module '@effect/core/io/Effect'

### absolve

Submerges the error case of an `Either` into the `Effect`. The inverse
operation of `either`.

```ts
export declare const absolve: <R, E, A>(self: Effect<R, E, Either<E, A>>) => Effect<R, E, A>;
```

### absorb

Attempts to convert defects into a failure, throwing away all information
about the cause of the failure.

```ts
export declare const absorb: <R, E, A>(self: Effect<R, E, A>) => Effect<R, unknown, A>;
```

### absorbWith

Attempts to convert defects into a failure, throwing away all information
about the cause of the failure.

```ts
export declare const absorbWith: <E>(f: (e: E) => unknown) => <R, A>(self: Effect<R, E, A>) => Effect<R, unknown, A>;
```

### acquireRelease

```ts
export declare const acquireRelease: <R, E, A, R2, X>(acquire: Effect<R, E, A>, release: (a: A) => Effect<R2, never, X>) => Effect<R | R2 | Scope, E, A>;
```

### acquireReleaseExit

```ts
export declare const acquireReleaseExit: <R, E, A, R2, X>(acquire: Effect<R, E, A>, release: (a: A, exit: Exit<unknown, unknown>) => Effect<R2, never, X>) => Effect<Scope | R | R2, E, A>;
```

### acquireReleaseInterruptible

A variant of `acquireRelease` that allows the `acquire` effect to be
interruptible. Since the `acquire` effect could be interrupted after
partially acquiring resources, the `release` effect is not allowed to
access the resource produced by `acquire` and must independently determine
what finalization, if any, needs to be performed (e.g. by examining in
memory state).

```ts
export declare const acquireReleaseInterruptible: <R, E, A, R2, X>(acquire: Effect<R, E, A>, release: Effect<R2, never, X>) => Effect<Scope | R | R2, E, A>;
```

### acquireReleaseInterruptibleExit

A more powerful variant of `acquireReleaseInterruptible` that allows the
`release` effect to depend on the `Exit` value specified when the scope
is closed.

```ts
export declare const acquireReleaseInterruptibleExit: <R, E, A, R2, X>(acquire: Effect<R, E, A>, release: (exit: Exit<unknown, unknown>) => Effect<R2, never, X>) => Effect<Scope | R | R2, E, A>;
```

### acquireUseRelease

```ts
export declare const acquireUseRelease: <R, E, A, R2, E2, A2, R3, X>(acquire: Effect<R, E, A>, use: (a: A) => Effect<R2, E2, A2>, release: (a: A) => Effect<R3, never, X>) => Effect<R | R2 | R3, E | E2, A2>;
```

### acquireUseReleaseDiscard

A less powerful variant of `acquireUseRelease` where the resource acquired
by this effect is not needed.

```ts
export declare const acquireUseReleaseDiscard: <R, E, A, R2, E2, A2, R3, X>(acquire: Effect<R, E, A>, use: Effect<R2, E2, A2>, release: Effect<R3, never, X>) => Effect<R | R2 | R3, E | E2, A2>;
```

### acquireUseReleaseExit

```ts
export declare const acquireUseReleaseExit: <R, E, A, R2, E2, A2, R3, X>(acquire: Effect<R, E, A>, use: (a: A) => Effect<R2, E2, A2>, release: (a: A, exit: Exit<E2, A2>) => Effect<R3, never, X>) => Effect<R | R2 | R3, E | E2, A2>;
```

### acquireUseReleaseOnError

Executes the release effect only if there was an error.

```ts
export declare const acquireUseReleaseOnError: <R, E, A, R2, E2, A2, R3, X>(acquire: Effect<R, E, A>, use: (a: A) => Effect<R2, E2, A2>, release: (a: A) => Effect<R3, never, X>) => Effect<R | R2 | R3, E | E2, A2>;
```

### addFinalizer

Adds a finalizer to the scope of this workflow. The finalizer is guaranteed
to be run when the scope is closed.

```ts
export declare const addFinalizer: <R, X>(finalizer: Effect<R, never, X>) => Effect<Scope | R, never, void>;
```

### addFinalizerExit

```ts
export declare const addFinalizerExit: <R, X>(finalizer: (exit: Exit<unknown, unknown>) => Effect<R, never, X>) => Effect<Scope | R, never, void>;
```

### allowInterrupt

Makes an explicit check to see if the fiber has been interrupted, and if
so, performs self-interruption

```ts
export declare const allowInterrupt: Effect<never, never, void>;
```

### as

Maps the success value of this effect to the specified constant value.

```ts
export declare const as: <B>(value: B) => <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, B>;
```

### asLeft

Maps the success value of this effect to a left value.

```ts
export declare const asLeft: <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, Either<A, never>>;
```

### asLeftError

Maps the error value of this effect to a left value.

```ts
export declare const asLeftError: <R, E, A>(self: Effect<R, E, A>) => Effect<R, Either<E, never>, A>;
```

### asRight

Maps the success value of this effect to a right value.

```ts
export declare const asRight: <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, Either<never, A>>;
```

### asRightError

Maps the error value of this effect to a right value.

```ts
export declare const asRightError: <R, E, A>(self: Effect<R, E, A>) => Effect<R, Either<never, E>, A>;
```

### asSome

Maps the success value of this effect to an optional value.

```ts
export declare const asSome: <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, Maybe<A>>;
```

### asSomeError

Maps the error value of this effect to an optional value.

```ts
export declare const asSomeError: <R, E, A>(self: Effect<R, E, A>) => Effect<R, Maybe<E>, A>;
```

### asUnit

Ignores the result of the effect replacing it with a void

```ts
export declare const asUnit: <R, E, X>(self: Effect<R, E, X>) => Effect<R, E, void>;
```

### async

```ts
export declare const async: <R, E, A>(register: (callback: (_: Effect<R, E, A>) => void) => void) => Effect<R, E, A>;
```

### asyncBlockingOn

Imports an asynchronous side-effect into a pure `Effect` value. See
`asyncMaybe` for the more expressive variant of this function that can
return a value synchronously.

The callback function `Effect<R, E, A> => any` must be called at most once.

The list of fibers, that may complete the async callback, is used to
provide better diagnostics.

```ts
export declare const asyncBlockingOn: <R, E, A>(register: (callback: (_: Effect<R, E, A>) => void) => void, blockingOn: FiberId) => Effect<R, E, A>;
```

### asyncEffect

Imports an asynchronous effect into a pure `Effect` value. This formulation
is necessary when the effect is itself expressed in terms of an `Effect`.

```ts
export declare const asyncEffect: <R, E, A, R2, E2, X>(register: (callback: (_: Effect<R, E, A>) => void) => Effect<R2, E2, X>) => Effect<R | R2, E | E2, A>;
```

### asyncInterrupt

```ts
export declare const asyncInterrupt: <R, E, A>(register: (callback: (_: Effect<R, E, A>) => void) => Either<Effect<R, never, void>, Effect<R, E, A>>) => Effect<R, E, A>;
```

### asyncInterruptBlockingOn

```ts
export declare const asyncInterruptBlockingOn: <R, E, A>(register: (callback: (_: Effect<R, E, A>) => void) => Either<Effect<R, never, void>, Effect<R, E, A>>, blockingOn: FiberId) => Effect<R, E, A>;
```

### asyncMaybe

Imports an asynchronous effect into a pure `Effect` value, possibly returning
the value synchronously.

If the register function returns a value synchronously, then the callback
function `Effect<R, E, A> => any` must not be called. Otherwise the callback
function must be called at most once.

```ts
export declare const asyncMaybe: <R, E, A>(register: (callback: (_: Effect<R, E, A>) => void) => Maybe<Effect<R, E, A>>) => Effect<R, E, A>;
```

### asyncMaybeBlockingOn

Imports an asynchronous effect into a pure `Effect` value, possibly returning
the value synchronously.

If the register function returns a value synchronously, then the callback
function `Effect<R, E, A> => any` must not be called. Otherwise the callback
function must be called at most once.

The list of fibers, that may complete the async callback, is used to
provide better diagnostics.

```ts
export declare const asyncMaybeBlockingOn: <R, E, A>(register: (callback: (_: Effect<R, E, A>) => void) => Maybe<Effect<R, E, A>>, blockingOn: FiberId) => Effect<R, E, A>;
```

### attempt

Imports a synchronous side-effect into a pure `Effect` value, translating any
thrown exceptions into typed failed effects creating with `Effect.fail`.

```ts
export declare const attempt: <A>(f: LazyArg<A>) => Effect<never, unknown, A>;
```

### awaitAllChildren

Returns a new effect that will not succeed with its value before first
waiting for the end of all child fibers forked by the effect.

```ts
export declare const awaitAllChildren: <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, A>;
```

### bind

Binds an effectful value in a `do` scope

```ts
export declare const bind: <N extends string, K, R2, E2, A>(tag: Exclude<N, keyof K>, f: (_: K) => Effect<R2, E2, A>) => <R, E>(self: Effect<R, E, K>) => Effect<R2 | R, E2 | E, MergeRecord<K, { [k in N]: A; }>>;
```

### bindValue

Like bind for values

```ts
export declare const bindValue: <N extends string, K, A>(tag: Exclude<N, keyof K>, f: (_: K) => A) => <R, E>(self: Effect<R, E, K>) => Effect<R, E, MergeRecord<K, { [k in N]: A; }>>;
```

### cached

Returns an effect that, if evaluated, will return the cached result of this
effect. Cached results will expire after `timeToLive` duration.

```ts
export declare const cached: (timeToLive: Duration) => <R, E, A>(self: Effect<R, E, A>) => Effect<R, never, Effect<never, E, A>>;
```

### cachedInvalidate

Returns an effect that, if evaluated, will return the cached result of this
effect. Cached results will expire after `timeToLive` duration. In
addition, returns an effect that can be used to invalidate the current
cached value before the `timeToLive` duration expires.

```ts
export declare const cachedInvalidate: (timeToLive: Duration) => <R, E, A>(self: Effect<R, E, A>) => Effect<R, never, readonly [Effect<never, E, A>, Effect<never, never, void>]>;
```

### catch

```ts
export declare const catch: <N extends keyof E, K extends E[N] & string, E, R1, E1, A1>(tag: N, k: K, f: (e: Extract<E, { [n in N]: K; }>) => Effect<R1, E1, A1>) => <R, A>(self: Effect<R, E, A>) => Effect<R1 | R, E1 | Exclude<E, { [n in N]: K; }>, A1 | A>;
```

### catchAll

Recovers from all errors.

```ts
export declare const catchAll: <E, R2, E2, A2>(f: (e: E) => Effect<R2, E2, A2>) => <R, A>(self: Effect<R, E, A>) => Effect<R2 | R, E2, A2 | A>;
```

### catchAllCause

Recovers from all errors with provided `Cause`.

See `absorb`, `sandbox`, `mapErrorCause` for other functions that can
recover from defects.

```ts
export declare const catchAllCause: <E, R2, E2, A2>(f: (cause: Cause<E>) => Effect<R2, E2, A2>) => <R, A>(self: Effect<R, E, A>) => Effect<R2 | R, E2, A2 | A>;
```

### catchAllDefect

Recovers from all defects with provided function.

**WARNING**: There is no sensible way to recover from defects. This
method should be used only at the boundary between Effect and an external
system, to transmit information on a defect for diagnostic or explanatory
purposes.

```ts
export declare const catchAllDefect: <R2, E2, A2>(f: (defect: unknown) => Effect<R2, E2, A2>) => <R, E, A>(self: Effect<R, E, A>) => Effect<R2 | R, E2 | E, A2 | A>;
```

### catchSome

Recovers from some or all of the error cases.

```ts
export declare const catchSome: <E, R2, E2, A2>(f: (e: E) => Maybe<Effect<R2, E2, A2>>) => <R, A>(self: Effect<R, E, A>) => Effect<R2 | R, E | E2, A2 | A>;
```

### catchSomeCause

Recovers from some or all of the error cases with provided cause.

```ts
export declare const catchSomeCause: <E, R2, E2, A2>(f: (_: Cause<E>) => Maybe<Effect<R2, E2, A2>>) => <R, A>(self: Effect<R, E, A>) => Effect<R2 | R, E | E2, A2 | A>;
```

### catchSomeDefect

Recovers from some or all of the defects with provided partial function.

**WARNING**: There is no sensible way to recover from defects. This
method should be used only at the boundary between Effect and an external
system, to transmit information on a defect for diagnostic or explanatory
purposes.

```ts
export declare const catchSomeDefect: <R2, E2, A2>(pf: (_: unknown) => Maybe<Effect<R2, E2, A2>>) => <R, E, A>(self: Effect<R, E, A>) => Effect<R2 | R, E2 | E, A2 | A>;
```

### catchTag

Recovers from specified error.

```ts
export declare const catchTag: <K extends E["_tag"] & string, E extends { _tag: string; }, R1, E1, A1>(k: K, f: (e: Extract<E, { _tag: K; }>) => Effect<R1, E1, A1>) => <R, A>(self: Effect<R, E, A>) => Effect<R1 | R, E1 | Exclude<E, { _tag: K; }>, A1 | A>;
```

### cause

Returns an effect that succeeds with the cause of failure of this effect,
or `Cause.empty` if the effect did succeed.

```ts
export declare const cause: <R, E, A>(self: Effect<R, E, A>) => Effect<R, never, Cause<E>>;
```

### checkInterruptible

```ts
export declare const checkInterruptible: <R, E, A>(f: (interruptStatus: InterruptStatus) => Effect<R, E, A>) => Effect<R, E, A>;
```

### clock

Retreives the `Clock` service from the environment.

```ts
export declare const clock: Effect<never, never, Clock>;
```

### clockWith

Retreives the `Clock` service from the environment and uses it to run the
specified effect.

```ts
export declare const clockWith: <R, E, A>(f: (clock: Clock) => Effect<R, E, A>) => Effect<R, E, A>;
```

### collect

Evaluate each effect in the structure from left to right, collecting the
the successful values and discarding the empty cases. For a parallel version, see `collectPar`.

```ts
export declare const collect: <A, R, E, B>(as: Collection<A>, f: (a: A) => Effect<R, Maybe<E>, B>) => Effect<R, E, Chunk<B>>;
```

### collectAll

```ts
export declare const collectAll: <R, E, A>(as: Collection<Effect<R, E, A>>) => Effect<R, E, Chunk<A>>;
```

### collectAllDiscard

```ts
export declare const collectAllDiscard: <R, E, A>(as: Collection<Effect<R, E, A>>) => Effect<R, E, void>;
```

### collectAllPar

```ts
export declare const collectAllPar: <R, E, A>(as: Collection<Effect<R, E, A>>) => Effect<R, E, Chunk<A>>;
```

### collectAllParDiscard

```ts
export declare const collectAllParDiscard: <R, E, A>(as: Collection<Effect<R, E, A>>) => Effect<R, E, void>;
```

### collectAllSuccesses

```ts
export declare const collectAllSuccesses: <R, E, A>(as: Collection<Effect<R, E, A>>) => Effect<R, never, Chunk<A>>;
```

### collectAllSuccessesPar

```ts
export declare const collectAllSuccessesPar: <R, E, A>(as: Collection<Effect<R, E, A>>) => Effect<R, never, Chunk<A>>;
```

### collectAllWith

```ts
export declare const collectAllWith: <R, E, A, B>(as: Collection<Effect<R, E, A>>, pf: (a: A) => Maybe<B>) => Effect<R, E, Chunk<B>>;
```

### collectAllWithEffect

```ts
export declare const collectAllWithEffect: <A, R, E, B>(self: Collection<A>, f: (a: A) => Maybe<Effect<R, E, B>>) => Effect<R, E, Chunk<B>>;
```

### collectAllWithPar

```ts
export declare const collectAllWithPar: <R, E, A, B>(as: Collection<Effect<R, E, A>>, pf: (a: A) => Maybe<B>) => Effect<R, E, Chunk<B>>;
```

### collectFirst

Collects the first element of the `Collection<A?` for which the effectual
function `f` returns `Some`.

```ts
export declare const collectFirst: <R, E, A, B>(as: Collection<A>, f: (a: A) => Effect<R, E, Maybe<B>>) => Effect<R, E, Maybe<B>>;
```

### collectPar

Evaluate each effect in the structure in parallel, collecting the
the successful values and discarding the empty cases.

```ts
export declare const collectPar: <A, R, E, B>(as: Collection<A>, f: (a: A) => Effect<R, Maybe<E>, B>) => Effect<R, E, Chunk<B>>;
```

### collectWhile

Transforms all elements of the chunk for as long as the specified partial
function is defined.

```ts
export declare const collectWhile: <A, R, E, B>(self: Collection<A>, f: (a: A) => Maybe<Effect<R, E, B>>) => Effect<R, E, Chunk<B>>;
```

### cond

Evaluate the predicate, return the given `A` as success if predicate returns
true, and the given `E` as error otherwise

For effectful conditionals, see `ifEffect`.

```ts
export declare const cond: <E, A>(predicate: LazyArg<boolean>, result: LazyArg<A>, error: LazyArg<E>) => Effect<never, E, A>;
```

### continueOrFail

Fail with `e` if the supplied `PartialFunction` does not match, otherwise
succeed with the returned value.

```ts
export declare const continueOrFail: <E1, A, A2>(e: E1, pf: (a: A) => Maybe<A2>) => <R, E>(self: Effect<R, E, A>) => Effect<R, E1 | E, A2>;
```

### continueOrFailEffect

Fail with `e` if the supplied `PartialFunction` does not match, otherwise
continue with the returned value.

```ts
export declare const continueOrFailEffect: <E1, A, R2, E2, A2>(e: E1, pf: (a: A) => Maybe<Effect<R2, E2, A2>>) => <R, E>(self: Effect<R, E, A>) => Effect<R2 | R, E1 | E2 | E, A2>;
```

### daemonChildren

```ts
export declare const daemonChildren: <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, A>;
```

### defaultFlags

```ts
export declare const defaultFlags: RuntimeFlags;
```

### defaultRuntime

```ts
export declare const defaultRuntime: Runtime<never>;
```

### delay

Returns an effect that is delayed from this effect by the specified
`Duration`.

```ts
export declare const delay: (duration: Duration) => <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, A>;
```

### deriveAccess

```ts
export declare const deriveAccess: <T>(S: Tag<T>) => <Gens extends keyof T = never>(generics: Gens[]) => DerivedAccess<T, Gens>;
```

### deriveAccessEffect

```ts
export declare const deriveAccessEffect: <T>(S: Tag<T>) => <Gens extends keyof T = never>(generics: Gens[]) => DerivedAccessM<T, Gens>;
```

### deriveLifted

```ts
export declare const deriveLifted: <T>(S: Tag<T>) => <Fns extends { [k in keyof T]: T[k] extends (...args: infer ARGS) => Effect<infer R, infer E, infer A> ? ((...args: ARGS) => Effect<R, E, A>) extends T[k] ? k : never : never; }[keyof T] = never, Cns extends { [k in keyof T]: T[k] extends Effect<any, any, any> ? k : never; }[keyof T] = never, Values extends keyof T = never>(functions: Fns[], effects: Cns[], values: Values[]) => DerivedLifted<T, Fns, Cns, Values>;
```

### descriptor

Returns information about the current fiber, such as its identity.

```ts
export declare const descriptor: Effect<never, never, Descriptor>;
```

### descriptorWith

Constructs an effect based on information about the current fiber, such as
its identity.

```ts
export declare const descriptorWith: <R, E, A>(f: (descriptor: Descriptor) => Effect<R, E, A>) => Effect<R, E, A>;
```

### die

Returns an effect that dies with the specified `unknown`. This method can
be used for terminating a fiber because a defect has been detected in the
code.

```ts
export declare const die: (defect: unknown) => Effect<never, never, never>;
```

### dieMessage

Returns an effect that dies with a `RuntimeException` having the specified
text message. This method can be used for terminating a fiber because a
defect has been detected in the code.

```ts
export declare const dieMessage: (message: string) => Effect<never, never, never>;
```

### dieSync

Returns an effect that dies with the specified `unknown`. This method can
be used for terminating a fiber because a defect has been detected in the
code.

```ts
export declare const dieSync: <A>(f: LazyArg<A>) => Effect<never, never, never>;
```

### disconnect

```ts
export declare const disconnect: <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, A>;
```

### done

Returns an effect from a `Exit` value.

```ts
export declare const done: <E, A>(exit: Exit<E, A>) => Effect<never, E, A>;
```

### dropWhile

Drops all elements so long as the predicate returns true.

```ts
export declare const dropWhile: <R, E, A>(self: Collection<A>, f: (a: A) => Effect<R, E, boolean>) => Effect<R, E, Chunk<A>>;
```

### either

Returns an effect whose failure and success have been lifted into an
`Either`. The resulting effect cannot fail, because the failure case has
been exposed as part of the `Either` success case.

This method is useful for recovering from effects that may fail.

The error parameter of the returned `Effect` is `never`, since it is
guaranteed the effect does not model failure.

```ts
export declare const either: <R, E, A>(self: Effect<R, E, A>) => Effect<R, never, Either<E, A>>;
```

### ensuring

Returns an effect that, if this effect _starts_ execution, then the
specified `finalizer` is guaranteed to begin execution, whether this effect
succeeds, fails, or is interrupted.

For use cases that need access to the effect's result, see `onExit`.

Finalizers offer very powerful guarantees, but they are low-level, and
should generally not be used for releasing resources. For higher-level
logic built on `ensuring`, see `acquireReleaseWith`.

```ts
export declare const ensuring: <R1, X>(finalizer: Effect<R1, never, X>) => <R, E, A>(self: Effect<R, E, A>) => Effect<R1 | R, E, A>;
```

### ensuringChild

Acts on the children of this fiber (collected into a single fiber),
guaranteeing the specified callback will be invoked, whether or not this
effect succeeds.

```ts
export declare const ensuringChild: <R2, X>(f: (_: Fiber<any, Chunk<unknown>>) => Effect<R2, never, X>) => <R, E, A>(self: Effect<R, E, A>) => Effect<R2 | R, E, A>;
```

### ensuringChildren

Acts on the children of this fiber, guaranteeing the specified callback
will be invoked, whether or not this effect succeeds.

```ts
export declare const ensuringChildren: <R1, X>(children: (_: Chunk<Runtime<any, any>>) => Effect<R1, never, X>) => <R, E, A>(self: Effect<R, E, A>) => Effect<R1 | R, E, A>;
```

### environment

```ts
export declare const environment: <R>() => Effect<R, never, Env<R>>;
```

### environmentWith

Accesses the environment of the effect.

```ts
export declare const environmentWith: <R, A>(f: (env: Env<R>) => A) => Effect<R, never, A>;
```

### environmentWithEffect

Effectually accesses the environment of the effect.

```ts
export declare const environmentWithEffect: <R, R0, E, A>(f: (env: Env<R0>) => Effect<R, E, A>) => Effect<R | R0, E, A>;
```

### eventually

Returns an effect that ignores errors and runs repeatedly until it
eventually succeeds.

```ts
export declare const eventually: <R, E, A>(self: Effect<R, E, A>) => Effect<R, never, A>;
```

### exists

Determines whether any element of the `Collection<A>` satisfies the effectual
predicate `f`.

```ts
export declare const exists: <R, E, A>(as: Collection<A>, f: (a: A) => Effect<R, E, boolean>) => Effect<R, E, boolean>;
```

### exit

Returns an effect that semantically runs the effect on a fiber, producing
an `Exit` for the completion value of the fiber.

```ts
export declare const exit: <R, E, A>(self: Effect<R, E, A>) => Effect<R, never, Exit<E, A>>;
```

### fail

Returns an effect that models failure with the specified error. The moral
equivalent of `throw` for pure code.

```ts
export declare const fail: <E>(error: E) => Effect<never, E, never>;
```

### failCause

Returns an effect that models failure with the specified `Cause`.

```ts
export declare const failCause: <E>(cause: Cause<E>) => Effect<never, E, never>;
```

### failCauseSync

Returns an effect that models failure with the specified `Cause`.

```ts
export declare const failCauseSync: <E>(cause: LazyArg<Cause<E>>) => Effect<never, E, never>;
```

### failSync

Returns an effect that models failure with the specified error. The moral
equivalent of `throw` for pure code.

```ts
export declare const failSync: <E>(error: LazyArg<E>) => Effect<never, E, never>;
```

### fiberId

Returns the `FiberId` of the fiber executing the effect that calls this
method.

```ts
export declare const fiberId: Effect<never, never, FiberId>;
```

### fiberIdWith

```ts
export declare const fiberIdWith: <R, E, A>(f: (descriptor: RuntimeFiberId) => Effect<R, E, A>) => Effect<R, E, A>;
```

### filter

Filters the collection using the specified effectual predicate.

```ts
export declare const filter: <A, R, E>(as: Collection<A>, f: (a: A) => Effect<R, E, boolean>) => Effect<R, E, Chunk<A>>;
```

### filterNot

Filters the collection using the specified effectual predicate, removing
all elements that satisfy the predicate.

```ts
export declare const filterNot: <A, R, E>(as: Collection<A>, f: (a: A) => Effect<R, E, boolean>) => Effect<R, E, Chunk<A>>;
```

### filterNotPar

Filters the collection in parallel using the specified effectual predicate.
See `filterNot` for a sequential version of it.

```ts
export declare const filterNotPar: <A, R, E>(as: Collection<A>, f: (a: A) => Effect<R, E, boolean>) => Effect<R, E, Chunk<A>>;
```

### filterOrDie

Dies with specified defect if the predicate fails.

```ts
export declare const filterOrDie: { <A, B extends A>(f: Refinement<A, B>, defect: LazyArg<unknown>): <R, E>(self: Effect<R, E, A>) => Effect<R, E, A>; <A>(f: Predicate<A>, defect: LazyArg<unknown>): <R, E>(self: Effect<R, E, A>) => Effect<R, E, A>; };
```

### filterOrDieMessage

Dies with specified defect if the predicate fails.

```ts
export declare const filterOrDieMessage: { <A, B extends A>(f: Refinement<A, B>, message: string): <R, E>(self: Effect<R, E, A>) => Effect<R, E, A>; <A>(f: Predicate<A>, message: string): <R, E>(self: Effect<R, E, A>) => Effect<R, E, A>; };
```

### filterOrElse

Applies `f` if the predicate fails.

```ts
export declare const filterOrElse: { <A, B extends A, R1, E1, A1>(f: Refinement<A, B>, effect: LazyArg<Effect<R1, E1, A1>>): <R, E>(self: Effect<R, E, A>) => Effect<R1 | R, E1 | E, B | A1>; <A, R1, E1, A1>(f: Predicate<A>, effect: LazyArg<Effect<R1, E1, A1>>): <R, E>(self: Effect<R, E, A>) => Effect<R1 | R, E1 | E, A | A1>; };
```

### filterOrElseWith

Applies `f` if the predicate fails.

```ts
export declare const filterOrElseWith: { <A, B extends A, R1, E1, A1>(f: Refinement<A, B>, orElse: (a: A) => Effect<R1, E1, A1>): <R, E>(self: Effect<R, E, A>) => Effect<R1 | R, E1 | E, B | A1>; <A, R1, E1, A1>(f: Predicate<A>, orElse: (a: A) => Effect<R1, E1, A1>): <R, E>(self: Effect<R, E, A>) => Effect<R1 | R, E1 | E, A | A1>; };
```

### filterOrFail

Fails with `e` if the predicate fails.

```ts
export declare const filterOrFail: { <E1, A, B extends A>(f: Refinement<A, B>, error: LazyArg<E1>): <R, E>(self: Effect<R, E, A>) => Effect<R, E1 | E, B>; <E1, A>(f: Predicate<A>, error: LazyArg<E1>): <R, E>(self: Effect<R, E, A>) => Effect<R, E1 | E, A>; };
```

### filterPar

Filters the collection in parallel using the specified effectual predicate.
See `filter` for a sequential version of it.

```ts
export declare const filterPar: <A, R, E>(as: Collection<A>, f: (a: A) => Effect<R, E, boolean>) => Effect<R, E, Chunk<A>>;
```

### find

Returns the first element that satisfies the effectful predicate.

```ts
export declare const find: <R, E, A>(self: Collection<A>, f: (a: A) => Effect<R, E, boolean>) => Effect<R, E, Maybe<A>>;
```

### firstSuccessOf

Returns an effect that runs this effect and in case of failure, runs each
of the specified effects in order until one of them succeeds.

```ts
export declare const firstSuccessOf: <R, E, A>(effects: Collection<Effect<R, E, A>>) => Effect<R, E, A>;
```

### flatMap

Returns an effect that models the execution of this effect, followed by the
passing of its value to the specified continuation function `k`, followed
by the effect that it returns.

```ts
export declare const flatMap: <A, R1, E1, B>(f: (a: A) => Effect<R1, E1, B>) => <R, E>(self: Effect<R, E, A>) => Effect<R1 | R, E1 | E, B>;
```

### flatten

Returns an effect that performs the outer effect first, followed by the
inner effect, yielding the value of the inner effect.

This method can be used to "flatten" nested effects.

```ts
export declare const flatten: <R, E, R1, E1, A>(self: Effect<R, E, Effect<R1, E1, A>>) => Effect<R | R1, E | E1, A>;
```

### flattenErrorMaybe

Unwraps the optional error, defaulting to the provided value.

```ts
export declare const flattenErrorMaybe: <E1>(def: E1) => <R, E, A>(self: Effect<R, Maybe<E>, A>) => Effect<R, E1 | E, A>;
```

### flip

Returns an effect that swaps the error/success cases. This allows you to
use all methods on the error channel, possibly before flipping back.

```ts
export declare const flip: <R, E, A>(self: Effect<R, E, A>) => Effect<R, A, E>;
```

### flipWith

Swaps the error/value parameters, applies the function `f` and flips the
parameters back

```ts
export declare const flipWith: <R, A, E, R2, A2, E2>(f: (self: Effect<R, A, E>) => Effect<R2, A2, E2>) => (self: Effect<R, E, A>) => Effect<R2, E2, A2>;
```

### fold

Folds over the failure value or the success value to yield an effect that
does not fail, but succeeds with the value returned by the left or right
function passed to `fold`.

```ts
export declare const fold: <E, A, A2, A3>(failure: (e: E) => A2, success: (a: A) => A3) => <R>(self: Effect<R, E, A>) => Effect<R, never, A2 | A3>;
```

### foldCause

A more powerful version of `fold` that allows recovering from any kind of
failure except interruptions.

```ts
export declare const foldCause: <E, A, A2, A3>(failure: (cause: Cause<E>) => A2, success: (a: A) => A3) => <R>(self: Effect<R, E, A>) => Effect<R, never, A2 | A3>;
```

### foldCauseEffect

A more powerful version of `foldEffect` that allows recovering from any kind
of failure except interruptions.

```ts
export declare const foldCauseEffect: <E, A, R2, E2, A2, R3, E3, A3>(failure: (cause: Cause<E>) => Effect<R2, E2, A2>, success: (a: A) => Effect<R3, E3, A3>) => <R>(self: Effect<R, E, A>) => Effect<R2 | R3 | R, E2 | E3, A2 | A3>;
```

### foldEffect

Recovers from errors by accepting one effect to execute for the case of an
error, and one effect to execute for the case of success.

This method has better performance than `either` since no intermediate
value is allocated and does not require subsequent calls to `chain` to
define the next effect.

The error parameter of the returned `IO` may be chosen arbitrarily, since
it will depend on the `IO`s returned by the given continuations.

```ts
export declare const foldEffect: <E, A, R2, E2, A2, R3, E3, A3>(failure: (e: E) => Effect<R2, E2, A2>, success: (a: A) => Effect<R3, E3, A3>) => <R>(self: Effect<R, E, A>) => Effect<R2 | R3 | R, E2 | E3, A2 | A3>;
```

### forAll

Determines whether all elements of the `Collection<A>` satisfies the effectual
predicate `f`.

```ts
export declare const forAll: <R, E, A>(as: Collection<A>, f: (a: A) => Effect<R, E, boolean>) => Effect<R, E, boolean>;
```

### forEach

```ts
export declare const forEach: <A, R, E, B>(as: Collection<A>, f: (a: A) => Effect<R, E, B>) => Effect<R, E, Chunk<B>>;
```

### forEachDiscard

```ts
export declare const forEachDiscard: <R, E, A, X>(as: Collection<A>, f: (a: A) => Effect<R, E, X>) => Effect<R, E, void>;
```

### forEachEffect

Returns a new effect that will pass the success value of this effect to the
provided callback. If this effect fails, then the failure will be ignored.

```ts
export declare const forEachEffect: <A, R1, E1, B>(f: (a: A) => Effect<R1, E1, B>) => <R, E>(self: Effect<R, E, A>) => Effect<R1 | R, E1, Maybe<B>>;
```

### forEachExec

```ts
export declare const forEachExec: <R, E, A, B>(as: Collection<A>, f: (a: A) => Effect<R, E, B>, strategy: ExecutionStrategy) => Effect<R, E, Chunk<B>>;
```

### forEachMaybe

Applies the function `f` if the argument is non-empty and returns the
results in a new `Maybe<B>`.

```ts
export declare const forEachMaybe: <R, E, A, B>(maybe: Maybe<A>, f: (a: A) => Effect<R, E, B>) => Effect<R, E, Maybe<B>>;
```

### forEachPar

```ts
export declare const forEachPar: <R, E, A, B>(as: Collection<A>, f: (a: A) => Effect<R, E, B>) => Effect<R, E, Chunk<B>>;
```

### forEachParDiscard

```ts
export declare const forEachParDiscard: <R, E, A, X>(as: Collection<A>, f: (a: A) => Effect<R, E, X>) => Effect<R, E, void>;
```

### forEachParWithIndex

```ts
export declare const forEachParWithIndex: <R, E, A, B>(as: Collection<A>, f: (a: A, i: number) => Effect<R, E, B>) => Effect<R, E, Chunk<B>>;
```

### forEachWithIndex

```ts
export declare const forEachWithIndex: <A, R, E, B>(as: Collection<A>, f: (a: A, i: number) => Effect<R, E, B>) => Effect<R, E, Chunk<B>>;
```

### forever

Repeats this effect forever (until the first error).

```ts
export declare const forever: <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, never>;
```

### fork

```ts
export declare const fork: <R, E, A>(self: Effect<R, E, A>) => Effect<R, never, Runtime<E, A>>;
```

### forkAll

Returns an effect that forks all of the specified values, and returns a
composite fiber that produces a list of their results, in order.

```ts
export declare const forkAll: <R, E, A>(effects: Collection<Effect<R, E, A>>) => Effect<R, never, Fiber<E, Chunk<A>>>;
```

### forkAllDiscard

Returns an effect that forks all of the specified values, and returns a
composite fiber that produces unit. This version is faster than `forkAll`
in cases where the results of the forked fibers are not needed.

```ts
export declare const forkAllDiscard: <R, E, A>(effects: Collection<Effect<R, E, A>>) => Effect<R, never, void>;
```

### forkDaemon

```ts
export declare const forkDaemon: <R, E, A>(self: Effect<R, E, A>) => Effect<R, never, Runtime<E, A>>;
```

### forkIn

Forks the effect in the specified scope. The fiber will be interrupted
when the scope is closed.

```ts
export declare const forkIn: (scope: Scope) => <R, E, A>(self: Effect<R, E, A>) => Effect<R, never, Runtime<E, A>>;
```

### forkScoped

Forks the fiber in a `Scope`, interrupting it when the scope is closed.

```ts
export declare const forkScoped: <R, E, A>(self: Effect<R, E, A>) => Effect<Scope | R, never, Runtime<E, A>>;
```

### forkWithErrorHandler

Like fork but handles an error with the provided handler.

```ts
export declare const forkWithErrorHandler: <E, X>(handler: (e: E) => Effect<never, never, X>) => <R, A>(self: Effect<R, E, A>) => Effect<R, never, Runtime<E, A>>;
```

### fromEither

Lifts an `Either` into an `Effect` value.

```ts
export declare const fromEither: <E, A>(either: Either<E, A>) => Effect<never, E, A>;
```

### fromEitherCause

Lifts an `Either` into an `Effect` value.

```ts
export declare const fromEitherCause: <E, A>(either: Either<Cause<E>, A>) => Effect<never, E, A>;
```

### fromFiber

Creates an `Effect` value that represents the exit value of the specified
fiber.

```ts
export declare const fromFiber: <E, A>(fiber: Fiber<E, A>) => Effect<never, E, A>;
```

### fromFiberEffect

Creates an `Effect` value that represents the exit value of the specified
fiber.

```ts
export declare const fromFiberEffect: <R, E, A>(fiber: Effect<R, E, Fiber<E, A>>) => Effect<R, E, A>;
```

### fromMaybe

Lifts an `Maybe` into an `Effect` but preserves the error as an option in
the error channel, making it easier to compose in some scenarios.

```ts
export declare const fromMaybe: <A>(option: Maybe<A>) => Effect<never, Maybe<never>, A>;
```

### gen

```ts
export declare const gen: <Eff extends GenEffect<any, any, any>, AEff>(f: (i: Adapter) => Generator<Eff, AEff, any>) => Effect<[Eff] extends [{ [_GenR]: () => infer R; }] ? R : never, [Eff] extends [{ [_GenE]: () => infer E; }] ? E : never, AEff>;
```

### genScoped

```ts
export declare const genScoped: <Eff extends GenEffect<any, any, any>, AEff>(f: (i: AdapterWithScope) => Generator<Eff, AEff, any>) => Effect<[Eff] extends [{ [_GenR]: () => infer R; }] ? R : never, [Eff] extends [{ [_GenE]: () => infer E; }] ? E : never, AEff>;
```

### getFiberRefs

Returns a collection of all `FiberRef` values for the fiber running this
effect.

```ts
export declare const getFiberRefs: Effect<never, never, FiberRefs>;
```

### getOrFail

Lifts an `Maybe` into an `Effect`, if the option is not defined it fails
with `NoSuchElementException`.

```ts
export declare const getOrFail: <A>(option: Maybe<A>) => Effect<never, NoSuchElement, A>;
```

### getOrFailDiscard

Lifts an `Maybe` into a `IO`, if the option is not defined it fails with
`void`.

```ts
export declare const getOrFailDiscard: <A>(option: Maybe<A>) => Effect<never, void, A>;
```

### getOrFailWith

Lifts an `Maybe` into an `Effect`. If the option is not defined, fail with
the specified `e` value.

```ts
export declare const getOrFailWith: <E, A>(option: Maybe<A>, e: LazyArg<E>) => Effect<never, E, A>;
```

### head

Returns a successful effect with the head of the collection if the collection
is non-empty, or fails with the error `None` if the collection is empty.

```ts
export declare const head: <R, E, A>(self: Effect<R, E, Collection<A>>) => Effect<R, Maybe<E>, A>;
```

### ifEffect

Runs `onTrue` if the result of `self` is `true` and `onFalse` otherwise.

```ts
export declare const ifEffect: <R, R1, R2, E, E1, E2, A, A1>(b: Effect<R, E, boolean>, onTrue: Effect<R1, E1, A>, onFalse: Effect<R2, E2, A1>) => Effect<R | R1 | R2, E | E1 | E2, A | A1>;
```

### ignore

Returns a new effect that ignores the success or failure of this effect.

```ts
export declare const ignore: <R, E, A>(self: Effect<R, E, A>) => Effect<R, never, void>;
```

### ignoreLogged

Returns a new effect that ignores the success or failure of this effect,
but which also logs failures at the Debug level, just in case the failure
turns out to be important.

```ts
export declare const ignoreLogged: <R, E, A>(self: Effect<R, E, A>) => Effect<R, never, void>;
```

### inheritFiberRefs

Inherits values from all [[FiberRef]] instances into current fiber.

```ts
export declare const inheritFiberRefs: (childFiberRefs: FiberRefs) => Effect<never, never, void>;
```

### interrupt

```ts
export declare const interrupt: Effect<never, never, never>;
```

### interruptAllChildren

Returns a new effect that will not succeed with its value before first
interrupting all child fibers forked by the effect.

```ts
export declare const interruptAllChildren: <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, A>;
```

### interruptAs

```ts
export declare const interruptAs: (fiberId: FiberId) => Effect<never, never, never>;
```

### interruptStatus

```ts
export declare const interruptStatus: (flag: LazyArg<InterruptStatus>) => <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, A>;
```

### interruptible

```ts
export declare const interruptible: <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, A>;
```

### interruptibleMask

```ts
export declare const interruptibleMask: <R, E, A>(f: (statusRestore: InterruptStatusRestore) => Effect<R, E, A>) => Effect<R, E, A>;
```

### intoDeferred

```ts
export declare const intoDeferred: <E, A>(deferred: Deferred<E, A>) => <R>(self: Effect<R, E, A>) => Effect<R, never, boolean>;
```

### isFailure

Returns whether this effect is a failure.

```ts
export declare const isFailure: <R, E, A>(self: Effect<R, E, A>) => Effect<R, never, boolean>;
```

### isSuccess

Returns whether this effect is a success.

```ts
export declare const isSuccess: <R, E, A>(self: Effect<R, E, A>) => Effect<R, never, boolean>;
```

### iterate

Iterates with the specified effectual function. The moral equivalent of:

```typescript
let s = initial

while (cont(s)) {
  s = body(s)
}

return s
```

```ts
export declare const iterate: <Z>(initial: Z, cont: (z: Z) => boolean) => <R, E>(body: (z: Z) => Effect<R, E, Z>) => Effect<R, E, Z>;
```

### left

"Zooms in" on the value in the `Left` side of an `Either`, moving the
possibility that the value is a `Right` to the error channel.

```ts
export declare const left: <R, E, A, B>(self: Effect<R, E, Either<A, B>>) => Effect<R, Either<E, B>, A>;
```

### leftWith

Performs the specified operation while "zoomed in" on the `Left` case of an
`Either`.

```ts
export declare const leftWith: <R, E, B, A, R1, E1, B1, A1>(f: (effect: Effect<R, Either<E, B>, A>) => Effect<R1, Either<E1, B1>, A1>) => (self: Effect<R, E, Either<A, B>>) => Effect<R | R1, E | E1, Either<A1, B1>>;
```

### log

Logs the specified message at the current log level.

```ts
export declare const log: (message: string) => Effect<never, never, void>;
```

### logAnnotate

Annotates each log in this effect with the specified log annotation.

```ts
export declare const logAnnotate: (key: string, value: string) => <R, E, A>(effect: Effect<R, E, A>) => Effect<R, E, A>;
```

### logAnnotations

Retrieves the log annotations associated with the current scope.

```ts
export declare const logAnnotations: () => Effect<never, never, ImmutableMap<string, string>>;
```

### logDebug

Logs the specified message at the debug log level.

```ts
export declare const logDebug: (message: string) => Effect<never, never, void>;
```

### logDebugCause

Logs the specified cause at the debug log level.

```ts
export declare const logDebugCause: <E>(cause: Cause<E>) => Effect<never, never, void>;
```

### logDebugCauseMessage

Logs the specified message and cause at the debug log level.

```ts
export declare const logDebugCauseMessage: <E>(message: string, cause: Cause<E>) => Effect<never, never, void>;
```

### logError

Logs the specified message at the error log level.

```ts
export declare const logError: (message: string) => Effect<never, never, void>;
```

### logErrorCause

Logs the specified cause at the error log level.

```ts
export declare const logErrorCause: <E>(cause: Cause<E>) => Effect<never, never, void>;
```

### logErrorCauseMessage

Logs the specified message and cause at the error log level.

```ts
export declare const logErrorCauseMessage: <E>(message: string, cause: Cause<E>) => Effect<never, never, void>;
```

### logFatal

Logs the specified message at the fatal log level.

```ts
export declare const logFatal: (message: string) => Effect<never, never, void>;
```

### logFatalCause

Logs the specified cause at the fatal log level.

```ts
export declare const logFatalCause: <E>(cause: Cause<E>) => Effect<never, never, void>;
```

### logFatalCauseMessage

Logs the specified message and cause at the fatal log level.

```ts
export declare const logFatalCauseMessage: <E>(message: string, cause: Cause<E>) => Effect<never, never, void>;
```

### logInfo

Logs the specified message at the informational log level.

```ts
export declare const logInfo: (message: string) => Effect<never, never, void>;
```

### logInfoCause

Logs the specified cause at the informational log level.

```ts
export declare const logInfoCause: <E>(cause: Cause<E>) => Effect<never, never, void>;
```

### logInfoCauseMessage

Logs the specified message and cause at the informational log level.

```ts
export declare const logInfoCauseMessage: <E>(message: string, cause: Cause<E>) => Effect<never, never, void>;
```

### logSpan

Adjusts the label for the current logging span.

```ts
export declare const logSpan: (label: string) => <R, E, A>(effect: Effect<R, E, A>) => Effect<R, E, A>;
```

### logTrace

Logs the specified message at the trace log level.

```ts
export declare const logTrace: (message: string) => Effect<never, never, void>;
```

### logTraceCause

Logs the specified cause at the trace log level.

```ts
export declare const logTraceCause: <E>(cause: Cause<E>) => Effect<never, never, void>;
```

### logTraceCauseMessage

Logs the specified message and cause at the trace log level.

```ts
export declare const logTraceCauseMessage: <E>(message: string, cause: Cause<E>) => Effect<never, never, void>;
```

### logWarning

Logs the specified message at the warning log level.

```ts
export declare const logWarning: (message: string) => Effect<never, never, void>;
```

### logWarningCause

Logs the specified cause at the warning log level.

```ts
export declare const logWarningCause: <E>(cause: Cause<E>) => Effect<never, never, void>;
```

### logWarningCauseMessage

Logs the specified message and cause at the warning log level.

```ts
export declare const logWarningCauseMessage: <E>(message: string, cause: Cause<E>) => Effect<never, never, void>;
```

### loop

Loops with the specified effectual function, collecting the results into a
list. The moral equivalent of:

```typescript
let s  = initial
let as = [] as readonly A[]

while (cont(s)) {
  as = [body(s), ...as]
  s  = inc(s)
}

A.reverse(as)
```

```ts
export declare const loop: <Z>(initial: Z, cont: (z: Z) => boolean, inc: (z: Z) => Z) => <R, E, A>(body: (z: Z) => Effect<R, E, A>) => Effect<R, E, Chunk<A>>;
```

### loopDiscard

Loops with the specified effectual function purely for its effects. The
moral equivalent of:

```typescript
var s = initial

while (cont(s)) {
  body(s)
  s = inc(s)
}
```

```ts
export declare const loopDiscard: <Z>(initial: Z, cont: (z: Z) => boolean, inc: (z: Z) => Z) => <R, E, X>(body: (z: Z) => Effect<R, E, X>) => Effect<R, E, void>;
```

### map

Returns an effect whose success is mapped by the specified `f` function.

```ts
export declare const map: <A, B>(f: (a: A) => B) => <R, E>(self: Effect<R, E, A>) => Effect<R, E, B>;
```

### mapAccum

Statefully and effectfully maps over the elements of this chunk to produce
new elements.

```ts
export declare const mapAccum: <A, B, R, E, S>(self: Collection<A>, s: S, f: (s: S, a: A) => Effect<R, E, readonly [S, B]>) => Effect<R, E, readonly [S, Chunk<B>]>;
```

### mapBoth

Returns an effect whose failure and success channels have been mapped by
the specified pair of functions, `f` and `g`.

```ts
export declare const mapBoth: <E, A, E2, A2>(f: (e: E) => E2, g: (a: A) => A2) => <R>(self: Effect<R, E, A>) => Effect<R, E2, A2>;
```

### mapError

Returns an effect with its error channel mapped using the specified
function. This can be used to lift a "smaller" error into a "larger" error.

```ts
export declare const mapError: <E, E2>(f: (e: E) => E2) => <R, A>(self: Effect<R, E, A>) => Effect<R, E2, A>;
```

### mapErrorCause

Returns an effect with its full cause of failure mapped using the specified
function. This can be used to transform errors while preserving the
original structure of `Cause`.

See `absorb`, `sandbox`, `catchAllCause` for other functions for dealing
with defects.

```ts
export declare const mapErrorCause: <E, E2>(f: (cause: Cause<E>) => Cause<E2>) => <R, A>(self: Effect<R, E, A>) => Effect<R, E2, A>;
```

### mapTryCatch

Returns an effect whose success is mapped by the specified side effecting
`f` function, translating any thrown exceptions into typed failed effects.

```ts
export declare const mapTryCatch: <A, B, E1>(f: (a: A) => B, onThrow: (u: unknown) => E1) => <R, E>(self: Effect<R, E, A>) => Effect<R, E1 | E, B>;
```

### memoize

Returns an effect that, if evaluated, will return the lazily computed
result of this effect.

```ts
export declare const memoize: <R, E, A>(self: Effect<R, E, A>) => Effect<never, never, Effect<R, E, A>>;
```

### memoizeF

Returns a memoized version of the specified effectual function.

```ts
export declare const memoizeF: <R, E, A, B>(f: (a: A) => Effect<R, E, B>) => Effect<never, never, (a: A) => Effect<R, E, B>>;
```

### merge

Returns a new effect where the error channel has been merged into the
success channel to their common combined type.

```ts
export declare const merge: <R, E, A>(self: Effect<R, E, A>) => Effect<R, never, E | A>;
```

### mergeAll

Merges an `Collection<Effect<R, E, A>>` to a single `Effect<R, E, B>`, working
sequentially.

```ts
export declare const mergeAll: <R, E, A, B>(as: Collection<Effect<R, E, A>>, zero: B, f: (b: B, a: A) => B) => Effect<R, E, B>;
```

### mergeAllPar

Merges an `Collection<Effect<R, E, A>>` to a single `Effect<R, E, A>`, working
in parallel.

Due to the parallel nature of this combinator, `f` must be both:
- commutative: `f(a, b) == f(b, a)`
- associative: `f(a, f(b, c)) == f(f(a, b), c)`

It's unsafe to execute side effects inside `f`, as `f` may be executed
more than once for some of `in` elements during effect execution.

```ts
export declare const mergeAllPar: <R, E, A, B>(as: Collection<Effect<R, E, A>>, zero: B, f: (b: B, a: A) => B) => Effect<R, E, B>;
```

### negate

Returns a new effect where boolean value of this effect is negated.

```ts
export declare const negate: <R, E>(self: Effect<R, E, boolean>) => Effect<R, E, boolean>;
```

### never

Returns a effect that will never produce anything. The moral equivalent of
`while(true) {}`, only without the wasted CPU cycles.

```ts
export declare const never: Effect<never, never, never>;
```

### none

Requires the option produced by this value to be `None`.

```ts
export declare const none: <R, E, A>(self: Effect<R, E, Maybe<A>>) => Effect<R, Maybe<E>, void>;
```

### noneOrFail

Lifts an `Maybe` into a `IO`. If the option is empty it succeeds with
`undefined`. If the option is defined it fails with the content.

```ts
export declare const noneOrFail: <E>(option: Maybe<E>) => Effect<never, E, void>;
```

### noneOrFailWith

Lifts an `Maybe` into a `IO`. If the option is empty it succeeds with
`undefined`. If the option is defined it fails with an error adapted with
the specified function.

```ts
export declare const noneOrFailWith: <E, A>(option: Maybe<A>, f: (a: A) => E) => Effect<never, E, void>;
```

### onDone

```ts
export declare const onDone: <E, A, R1, X1, R2, X2>(error: (e: E) => Effect<R1, never, X1>, success: (a: A) => Effect<R2, never, X2>) => <R>(self: Effect<R, E, A>) => Effect<R1 | R2 | R, never, void>;
```

### onDoneCause

```ts
export declare const onDoneCause: <E, A, R1, X1, R2, X2>(error: (e: Cause<E>) => Effect<R1, never, X1>, success: (a: A) => Effect<R2, never, X2>) => <R>(self: Effect<R, E, A>) => Effect<R1 | R2 | R, never, void>;
```

### onError

Runs the specified effect if this effect fails, providing the error to the
effect if it exists. The provided effect will not be interrupted.

```ts
export declare const onError: <E, R2, X>(cleanup: (cause: Cause<E>) => Effect<R2, never, X>) => <R, A>(self: Effect<R, E, A>) => Effect<R2 | R, E, A>;
```

### onExit

Ensures that a cleanup functions runs, whether this effect succeeds, fails,
or is interrupted.

```ts
export declare const onExit: <E, A, R2, X>(cleanup: (exit: Exit<E, A>) => Effect<R2, never, X>) => <R>(self: Effect<R, E, A>) => Effect<R2 | R, E, A>;
```

### onFirst

Propagates the success value to the first element of a tuple, but
passes the effect input `R` along unmodified as the second element
of the tuple.

```ts
export declare const onFirst: <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, readonly [A, Env<R>]>;
```

### onInterrupt

```ts
export declare const onInterrupt: <R2, X>(cleanup: (interruptors: HashSet<FiberId>) => Effect<R2, never, X>) => <R, E, A>(self: Effect<R, E, A>) => Effect<R2 | R, E, A>;
```

### onInterruptPolymorphic

```ts
export declare const onInterruptPolymorphic: <R2, E2, X>(cleanup: (interruptors: HashSet<FiberId>) => Effect<R2, E2, X>) => <R, E, A>(self: Effect<R, E, A>) => Effect<R2 | R, E2 | E, A>;
```

### onSecond

Propagates the success value to the second element of a tuple, but
passes the effect input `R` along unmodified as the first element
of the tuple.

```ts
export declare const onSecond: <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, readonly [Env<R>, A]>;
```

### onTermination

Runs the specified effect if this effect is terminated, either because of a
defect or because of interruption.

```ts
export declare const onTermination: <R2, X>(cleanup: (cause: Cause<never>) => Effect<R2, never, X>) => <R, E, A>(self: Effect<R, E, A>) => Effect<R2 | R, E, A>;
```

### once

Returns an effect that will be executed at most once, even if it is
evaluated multiple times.

```ts
export declare const once: <R, E, A>(self: Effect<R, E, A>) => Effect<never, never, Effect<R, E, void>>;
```

### option

Executes this effect, skipping the error but returning optionally the
success.

```ts
export declare const option: <R, E, A>(self: Effect<R, E, A>) => Effect<R, never, Maybe<A>>;
```

### orDie

Translates effect failure into death of the fiber, making all failures
unchecked and not a part of the type of the effect.

```ts
export declare const orDie: <R, E, A>(self: Effect<R, E, A>) => Effect<R, never, A>;
```

### orDieKeep

Converts all failures to unchecked exceptions.

```ts
export declare const orDieKeep: <R, E, A>(self: Effect<R, E, A>) => Effect<R, never, A>;
```

### orDieWith

Keeps none of the errors, and terminates the fiber with them, using the
specified function to convert the `E` into a `Throwable`.

```ts
export declare const orDieWith: <E>(f: (e: E) => unknown) => <R, A>(self: Effect<R, E, A>) => Effect<R, never, A>;
```

### orElse

Executes this effect and returns its value, if it succeeds, but otherwise
executes the specified effect.

```ts
export declare const orElse: <R2, E2, A2>(that: LazyArg<Effect<R2, E2, A2>>) => <R, E, A>(self: Effect<R, E, A>) => Effect<R2 | R, E2, A2 | A>;
```

### orElseEither

Returns an effect that will produce the value of this effect, unless it
fails, in which case, it will produce the value of the specified effect.

```ts
export declare const orElseEither: <R2, E2, A2>(that: LazyArg<Effect<R2, E2, A2>>) => <R, E, A>(self: Effect<R, E, A>) => Effect<R2 | R, E2, Either<A, A2>>;
```

### orElseFail

Executes this effect and returns its value, if it succeeds, but otherwise
fails with the specified error.

```ts
export declare const orElseFail: <E2>(e: LazyArg<E2>) => <R, E, A>(self: Effect<R, E, A>) => Effect<R, E2, A>;
```

### orElseOptional

Returns an effect that will produce the value of this effect, unless it
fails with the `None` value, in which case it will produce the value of
the specified effect.

```ts
export declare const orElseOptional: <R, E, A, R2, E2, A2>(that: LazyArg<Effect<R2, Maybe<E2>, A2>>) => (self: Effect<R, Maybe<E>, A>) => Effect<R | R2, Maybe<E | E2>, A | A2>;
```

### orElseSucceed

Executes this effect and returns its value, if it succeeds, but
otherwise succeeds with the specified value.

```ts
export declare const orElseSucceed: <A2>(a: LazyArg<A2>) => <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, A2 | A>;
```

### parallelErrors

Exposes all parallel errors in a single call.

```ts
export declare const parallelErrors: <R, E, A>(self: Effect<R, E, A>) => Effect<R, Chunk<E>, A>;
```

### parallelFinalizers

```ts
export declare const parallelFinalizers: <R, E, A>(self: Effect<R, E, A>) => Effect<Scope | R, E, A>;
```

### parallelism

Retrieves the maximum number of fibers for parallel operators or `None` if
it is unbounded.

```ts
export declare const parallelism: () => Effect<never, never, Maybe<number>>;
```

### parallelismWith

Retrieves the current maximum number of fibers for parallel operators and
uses it to run the specified effect.

```ts
export declare const parallelismWith: <R, E, A>(f: (parallelism: Maybe<number>) => Effect<R, E, A>) => Effect<R, E, A>;
```

### partition

Feeds elements of type `A` to a function `f` that returns an effect.
Collects all successes and failures in a tupled fashion.

```ts
export declare const partition: <R, E, A, B>(as: Collection<A>, f: (a: A) => Effect<R, E, B>) => Effect<R, never, readonly [Chunk<E>, Chunk<B>]>;
```

### partitionPar

Feeds elements of type `A` to a function `f` that returns an effect.
Collects all successes and failures in parallel and returns the result as a
tuple.

```ts
export declare const partitionPar: <R, E, A, B>(as: Collection<A>, f: (a: A) => Effect<R, E, B>) => Effect<R, never, readonly [Chunk<E>, Chunk<B>]>;
```

### pipeEffect

```ts
export declare const pipeEffect: <A, B>(a: A, f: (a: A) => B) => B;
```

### promise

Like `tryPromise` but produces a defect in case of errors.

```ts
export declare const promise: <A>(promise: LazyArg<Promise<A>>) => Effect<never, never, A>;
```

### provideEnvironment

```ts
export declare const provideEnvironment: <R>(environment: Env<R>) => <E, A>(self: Effect<R, E, A>) => Effect<never, E, A>;
```

### provideLayer

Provides a layer to the effect, which translates it to another level.

```ts
export declare const provideLayer: <R, E, A>(layer: Layer<R, E, A>) => <E1, A1>(self: Effect<A, E1, A1>) => Effect<R, E | E1, A1>;
```

### provideService

Provides the effect with the single service it requires. If the effect
requires more than one service use `provideEnvironment` instead.

```ts
export declare const provideService: <T>(tag: Tag<T>, resource: T) => <R, E, A>(self: Effect<R, E, A>) => Effect<Exclude<R, T>, E, A>;
```

### provideServiceEffect

Provides the effect with the single service it requires. If the effect
requires more than one service use `provideEnvironment` instead.

```ts
export declare const provideServiceEffect: <T, R1, E1>(tag: Tag<T>, effect: Effect<R1, E1, T>) => <R, E, A>(self: Effect<R, E, A>) => Effect<R1 | Exclude<R, T>, E1 | E, A>;
```

### provideSomeEnvironment

Provides some of the environment required to run this effect,
leaving the remainder `R0`.

```ts
export declare const provideSomeEnvironment: <R0, R>(f: (r0: Env<R0>) => Env<R>) => <E, A>(self: Effect<R, E, A>) => Effect<R0, E, A>;
```

### provideSomeLayer

Splits the environment into two parts, providing one part using the
specified layer and leaving the remainder `R0`.

```ts
export declare const provideSomeLayer: <R1, E1, A1>(layer: Layer<R1, E1, A1>) => <R, E, A>(self: Effect<R, E, A>) => Effect<R1 | Exclude<R, A1>, E1 | E, A>;
```

### race

Returns an effect that races this effect with the specified effect,
returning the first successful `A` from the faster side. If one effect
succeeds, the other will be interrupted. If neither succeeds, then the
effect will fail with some error.

Note that both effects are disconnected before being raced. This means that
interruption of the loser will always be performed in the background. This
is a change in behavior compared to ZIO 2.0. If this behavior is not
desired, you can use [[Effect#raceWith]], which will not disconnect or
interrupt losers.

```ts
export declare const race: <R2, E2, A2>(that: Effect<R2, E2, A2>) => <R, E, A>(self: Effect<R, E, A>) => Effect<R2 | R, E2 | E, A2 | A>;
```

### raceAll

Returns an effect that races this effect with all the specified effects,
yielding the value of the first effect to succeed with a value. Losers of
the race will be interrupted immediately

```ts
export declare const raceAll: <R1, E1, A1>(effects: Collection<Effect<R1, E1, A1>>) => <R, E, A>(self: Effect<R, E, A>) => Effect<R1 | R, E1 | E, A1 | A>;
```

### raceAwait

Returns an effect that races this effect with the specified effect,
returning the first successful `A` from the faster side. If one effect
succeeds, the other will be interrupted. If neither succeeds, then the
effect will fail with some error.

```ts
export declare const raceAwait: <R2, E2, A2>(that: Effect<R2, E2, A2>) => <R, E, A>(self: Effect<R, E, A>) => Effect<R2 | R, E2 | E, A2 | A>;
```

### raceEither

Returns an effect that races this effect with the specified effect,
yielding the first result to succeed. If neither effect succeeds, then the
composed effect will fail with some error.

WARNING: The raced effect will safely interrupt the "loser", but will not
resume until the loser has been cleanly terminated.

```ts
export declare const raceEither: <R2, E2, A2>(that: Effect<R2, E2, A2>) => <R, E, A>(self: Effect<R, E, A>) => Effect<R2 | R, E2 | E, Either<A, A2>>;
```

### raceFibersWith

Forks this effect and the specified effect into their own fibers, and races
them, calling one of two specified callbacks depending on which fiber wins
the race. This method does not interrupt, join, or otherwise do anything
with the fibers. It can be considered a low-level building block for
higher-level operators like `race`.

```ts
export declare const raceFibersWith: <E, A, R1, E1, A1, R2, E2, A2, R3, E3, A3>(that: Effect<R1, E1, A1>, selfWins: (winner: Fiber<E, A>, loser: Fiber<E1, A1>) => Effect<R2, E2, A2>, thatWins: (winner: Fiber<E1, A1>, loser: Fiber<E, A>) => Effect<R3, E3, A3>) => <R>(self: Effect<R, E, A>) => Effect<R1 | R2 | R3 | R, E2 | E3, A2 | A3>;
```

### raceFirst

Returns an effect that races this effect with the specified effect,
yielding the first result to complete, whether by success or failure. If
neither effect completes, then the composed effect will not complete.

WARNING: The raced effect will safely interrupt the "loser", but will not
resume until the loser has been cleanly terminated. If early return is
desired, then instead of performing `l raceFirst r`, perform
`l.disconnect raceFirst r.disconnect`, which disconnects left and right
interrupt signal, allowing a fast return, with interruption performed
in the background.

```ts
export declare const raceFirst: <R2, E2, A2>(that: Effect<R2, E2, A2>) => <R, E, A>(self: Effect<R, E, A>) => Effect<R2 | R, E2 | E, A2 | A>;
```

### raceWith

Returns an effect that races this effect with the specified effect, calling
the specified finisher as soon as one result or the other has been computed.

```ts
export declare const raceWith: <E, A, R1, E1, A1, R2, E2, A2, R3, E3, A3>(that: Effect<R1, E1, A1>, leftDone: (exit: Exit<E, A>, fiber: Fiber<E1, A1>) => Effect<R2, E2, A2>, rightDone: (exit: Exit<E1, A1>, fiber: Fiber<E, A>) => Effect<R3, E3, A3>) => <R>(self: Effect<R, E, A>) => Effect<R1 | R2 | R3 | R, E2 | E3, A2 | A3>;
```

### random

Retreives the `Random` service from the environment.

```ts
export declare const random: Effect<never, never, Random>;
```

### randomWith

Retreives the `Random` service from the environment and uses it to run the
specified workflow.

```ts
export declare const randomWith: <R, E, A>(f: (random: Random) => Effect<R, E, A>) => Effect<R, E, A>;
```

### reduce

Folds an `Collection<A>` using an effectual function f, working sequentially from left to right.

```ts
export declare const reduce: <A, Z, R, E>(as: Collection<A>, z: Z, f: (z: Z, a: A) => Effect<R, E, Z>) => Effect<R, E, Z>;
```

### reduceAll

Reduces an `Collection<Effect<R, E, A>>` to a single `Effect<R, E, A>`, working
sequentially.

```ts
export declare const reduceAll: <R, E, A>(a: Effect<R, E, A>, as: Collection<Effect<R, E, A>>, f: (acc: A, a: A) => A) => Effect<R, E, A>;
```

### reduceAllPar

Reduces an `Collection<Effect<R, E, A>>` to a single `Effect<R, E, A>`, working
in parallel.

```ts
export declare const reduceAllPar: <R, E, A>(a: Effect<R, E, A>, as: Collection<Effect<R, E, A>>, f: (acc: A, a: A) => A) => Effect<R, E, A>;
```

### reduceRight_

Folds an `Collection<A>` using an effectual function f, working sequentially from left to right.

```ts
export declare const reduceRight_: <A, Z, R, E>(as: Collection<A>, z: Z, f: (a: A, z: Z) => Effect<R, E, Z>) => Effect<R, E, Z>;
```

### reduceWhile

Folds over the elements in this chunk from the left.
Stops the fold early when the condition is not fulfilled.

```ts
export declare const reduceWhile: <A, R, E, S>(self: Collection<A>, s: S, p: Predicate<S>, f: (s: S, a: A) => Effect<R, E, S>) => Effect<R, E, S>;
```

### refineOrDie

Keeps some of the errors, and terminates the fiber with the rest

```ts
export declare const refineOrDie: <E, E1>(pf: (e: E) => Maybe<E1>) => <R, A>(self: Effect<R, E, A>) => Effect<R, E1, A>;
```

### refineOrDieWith

Keeps some of the errors, and terminates the fiber with the rest, using
the specified function to convert the `E` into a `Throwable`.

```ts
export declare const refineOrDieWith: <E, E1>(pf: (e: E) => Maybe<E1>, f: (e: E) => unknown) => <R, A>(self: Effect<R, E, A>) => Effect<R, E1, A>;
```

### reject

Fail with the returned value if the `PartialFunction` matches, otherwise
continue with our held value.

```ts
export declare const reject: <A, E1>(pf: (a: A) => Maybe<E1>) => <R, E>(self: Effect<R, E, A>) => Effect<R, E1 | E, A>;
```

### rejectEffect

Continue with the returned computation if the `PartialFunction` matches,
translating the successful match into a failure, otherwise continue with
our held value.

```ts
export declare const rejectEffect: <A, R1, E1>(pf: (a: A) => Maybe<Effect<R1, E1, E1>>) => <R, E>(self: Effect<R, E, A>) => Effect<R1 | R, E1 | E, A>;
```

### repeat

Returns a new effect that repeats this effect according to the specified
schedule or until the first failure. Scheduled recurrences are in addition
to the first execution, so that `io.repeat(Schedule.once)` yields an effect
that executes `io`, and then if that succeeds, executes `io` an additional
time.

```ts
export declare const repeat: <S, R1, A, B>(schedule: Schedule<S, R1, A, B>) => <R, E>(self: Effect<R, E, A>) => Effect<R1 | R, E, B>;
```

### repeatN

Returns a new effect that repeats this effect the specified number of times
or until the first failure. Repeats are in addition to the first execution,
so that `io.repeatN(1)` yields an effect that executes `io`, and then if
that succeeds, executes `io` an additional time.

```ts
export declare const repeatN: (n: number) => <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, A>;
```

### repeatOrElse

Returns a new effect that repeats this effect according to the specified
schedule or until the first failure, at which point, the failure value and
schedule output are passed to the specified handler.

Scheduled recurrences are in addition to the first execution, so that
`io.repeat(Schedule.once)` yields an effect that executes `io`, and then if
that succeeds, executes `io` an additional time.

```ts
export declare const repeatOrElse: <S, R1, A, B, E, R2, E2>(schedule: Schedule<S, R1, A, B>, orElse: (e: E, option: Maybe<B>) => Effect<R2, E2, B>) => <R>(self: Effect<R, E, A>) => Effect<R1 | R2 | R, E2, B>;
```

### repeatOrElseEither

Returns a new effect that repeats this effect according to the specified
schedule or until the first failure, at which point, the failure value and
schedule output are passed to the specified handler.

Scheduled recurrences are in addition to the first execution, so that
`io.repeat(Schedule.once)` yields an effect that executes `io`, and then if
that succeeds, executes `io` an additional time.

```ts
export declare const repeatOrElseEither: <S, R1, A, B, E, R2, E2, C>(schedule: Schedule<S, R1, A, B>, orElse: (e: E, option: Maybe<B>) => Effect<R2, E2, C>) => <R>(self: Effect<R, E, A>) => Effect<R1 | R2 | R, E2, Either<C, B>>;
```

### repeatUntil

Repeats this effect until its value satisfies the specified predicate or
until the first failure.

```ts
export declare const repeatUntil: <A>(p: Predicate<A>) => <R, E>(self: Effect<R, E, A>) => Effect<R, E, A>;
```

### repeatUntilEffect

Repeats this effect until its value satisfies the specified effectful
predicate or until the first failure.

```ts
export declare const repeatUntilEffect: <A, R1>(f: (a: A) => Effect<R1, never, boolean>) => <R, E>(self: Effect<R, E, A>) => Effect<R1 | R, E, A>;
```

### repeatUntilEquals

Repeats this effect until its value is equal to the specified value or
until the first failure.

```ts
export declare const repeatUntilEquals: <A>(E: Equivalence<A>, a: A) => <R, E>(self: Effect<R, E, A>) => Effect<R, E, A>;
```

### repeatWhile

Repeats this effect while its value satisfies the specified effectful
predicate or until the first failure.

```ts
export declare const repeatWhile: <A>(f: Predicate<A>) => <R, E>(self: Effect<R, E, A>) => Effect<R, E, A>;
```

### repeatWhileEffect

Repeats this effect while its value satisfies the specified effectful
predicate or until the first failure.

```ts
export declare const repeatWhileEffect: <R1, A>(f: (a: A) => Effect<R1, never, boolean>) => <R, E>(self: Effect<R, E, A>) => Effect<R1 | R, E, A>;
```

### repeatWhileEquals

Repeats this effect for as long as its value is equal to the specified
value or until the first failure.

```ts
export declare const repeatWhileEquals: <A>(E: Equivalence<A>, a: A) => <R, E>(self: Effect<R, E, A>) => Effect<R, E, A>;
```

### replicate

Replicates the given effect `n` times.

```ts
export declare const replicate: (n: number) => <R, E, A>(self: Effect<R, E, A>) => Chunk<Effect<R, E, A>>;
```

### replicateEffect

Performs this effect the specified number of times and collects the
results.

```ts
export declare const replicateEffect: (n: number) => <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, Chunk<A>>;
```

### replicateEffectDiscard

Performs this effect the specified number of times, discarding the
results.

```ts
export declare const replicateEffectDiscard: (n: number) => <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, void>;
```

### resurrect

Unearth the unchecked failure of the effect (opposite of `orDie`).

```ts
export declare const resurrect: <R, E, A>(self: Effect<R, E, A>) => Effect<R, unknown, A>;
```

### retry

Retries with the specified retry policy. Retries are done following the
failure of the original `io` (up to a fixed maximum with `once` or `recurs`
for example), so that that `io.retry(Schedule.once)` means "execute `io`
and in case of failure, try again once".

```ts
export declare const retry: <S, R1, E, B>(policy: Schedule<S, R1, E, B>) => <R, A>(self: Effect<R, E, A>) => Effect<R1 | R, E, A>;
```

### retryN

Retries this effect the specified number of times.

```ts
export declare const retryN: (n: number) => <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, A>;
```

### retryOrElse

Retries with the specified schedule, until it fails, and then both the
value produced by the schedule together with the last error are passed to
the recovery function.

```ts
export declare const retryOrElse: <S, R1, E extends E3, A1, R2, E2, A2, E3>(policy: Schedule<S, R1, E3, A1>, orElse: (e: E, out: A1) => Effect<R2, E2, A2>) => <R, A>(self: Effect<R, E, A>) => Effect<R1 | R2 | R, E | E2, A2 | A>;
```

### retryOrElseEither

Retries with the specified schedule, until it fails, and then both the
value produced by the schedule together with the last error are passed to
the recovery function.

```ts
export declare const retryOrElseEither: <S, R1, E extends E3, A1, R2, E2, A2, E3>(policy: Schedule<S, R1, E3, A1>, orElse: (e: E, out: A1) => Effect<R2, E2, A2>) => <R, A>(self: Effect<R, E, A>) => Effect<R1 | R2 | R, E | E2, Either<A2, A>>;
```

### retryUntil

Retries this effect until its error satisfies the specified predicate.

```ts
export declare const retryUntil: <E>(f: Predicate<E>) => <R, A>(self: Effect<R, E, A>) => Effect<R, E, A>;
```

### retryUntilEffect

Retries this effect until its error satisfies the specified effectful
predicate.

```ts
export declare const retryUntilEffect: <R1, E>(f: (e: E) => Effect<R1, never, boolean>) => <R, A>(self: Effect<R, E, A>) => Effect<R1 | R, E, A>;
```

### retryUntilEquals

Retries this effect until its error is equal to the specified error.

```ts
export declare const retryUntilEquals: <E>(E: Equivalence<E>, e: E) => <R, A>(self: Effect<R, E, A>) => Effect<R, E, A>;
```

### retryWhile

Retries this effect while its error satisfies the specified predicate.

```ts
export declare const retryWhile: <E>(f: Predicate<E>) => <R, A>(self: Effect<R, E, A>) => Effect<R, E, A>;
```

### retryWhileEffect

Retries this effect while its error satisfies the specified effectful
predicate.

```ts
export declare const retryWhileEffect: <R1, E>(f: (e: E) => Effect<R1, never, boolean>) => <R, A>(self: Effect<R, E, A>) => Effect<R1 | R, E, A>;
```

### retryWhileEquals

Retries this effect for as long as its error is equal to the specified
error.

```ts
export declare const retryWhileEquals: <E>(E: Equivalence<E>, e: E) => <R, A>(self: Effect<R, E, A>) => Effect<R, E, A>;
```

### right

"Zooms in" on the value in the `Right` side of an `Either`, moving the
possibility that the value is a `Left` to the error channel.

```ts
export declare const right: <R, E, A, B>(self: Effect<R, E, Either<A, B>>) => Effect<R, Either<A, E>, B>;
```

### rightWith

Performs the specified operation while "zoomed in" on the `Right` case of an
`Either`.

```ts
export declare const rightWith: <R, E, A, A1, B, B1, R1, E1>(f: (effect: Effect<R, Either<A, E>, B>) => Effect<R1, Either<A1, E1>, B1>) => (self: Effect<R, E, Either<A, B>>) => Effect<R | R1, E | E1, Either<A1, B1>>;
```

### runtime

Returns an effect that accesses the runtime, which can be used to
(unsafely) execute tasks. This is useful for integration with legacy code
that must call back into Effect code.

```ts
export declare const runtime: <R>() => Effect<R, never, Runtime<R>>;
```

### sandbox

Exposes the full cause of failure of this effect.

```ts
export declare const sandbox: <R, E, A>(self: Effect<R, E, A>) => Effect<R, Cause<E>, A>;
```

### schedule

Runs this effect according to the specified schedule.

See `scheduleFrom` for a variant that allows the schedule's decision to
depend on the result of this effect.

```ts
export declare const schedule: <S, R1, A1>(schedule: Schedule<S, R1, any, A1>) => <R, E, A>(self: Effect<R, E, A>) => Effect<R1 | R, E, A1>;
```

### scheduleForked

Runs this effect according to the specified schedule in a new fiber
attached to the current scope.

```ts
export declare const scheduleForked: <S, R1, A1>(schedule: Schedule<S, R1, unknown, A1>) => <R, E, A>(self: Effect<R, E, A>) => Effect<Scope | R1 | R, E, Runtime<unknown, A1>>;
```

### scheduleFrom

Runs this effect according to the specified schedule.

See `scheduleFrom` for a variant that allows the schedule's decision to
depend on the result of this effect.

```ts
export declare const scheduleFrom: <S, R1, A, A1>(a: A, schedule: Schedule<S, R1, A, A1>) => <R, E>(self: Effect<R, E, A>) => Effect<R1 | R, E, A1>;
```

### scope

```ts
export declare const scope: Effect<Scope, never, Scope>;
```

### scopeWith

Accesses the current scope and uses it to perform the specified effect.

```ts
export declare const scopeWith: <R, E, A>(f: (scope: Scope) => Effect<R, E, A>) => Effect<Scope | R, E, A>;
```

### scoped

Scopes all resources uses in this workflow to the lifetime of the workflow,
ensuring that their finalizers are run as soon as this workflow completes
execution, whether by success, failure, or interruption.

```ts
export declare const scoped: <R, E, A>(effect: Effect<R, E, A>) => Effect<Exclude<R, Scope>, E, A>;
```

### service

```ts
export declare const service: <T>(tag: Tag<T>) => Effect<T, never, T>;
```

### serviceWith

Accesses the specified service in the environment of the effect.

Especially useful for creating "accessor" methods on services' companion
objects.

```ts
export declare const serviceWith: <T, A>(tag: Tag<T>, f: (a: T) => A) => Effect<T, never, A>;
```

### serviceWithEffect

```ts
export declare const serviceWithEffect: <T, R, E, A>(tag: Tag<T>, f: (a: T) => Effect<R, E, A>) => Effect<T | R, E, A>;
```

### setFiberRefs

Sets the `FiberRef` values for the fiber running this effect to the values
in the specified collection of `FiberRef` values.

```ts
export declare const setFiberRefs: (fiberRefs: FiberRefs) => Effect<never, never, void>;
```

### sleep

Returns an effect that suspends for the specified duration. This method is
asynchronous, and does not actually block the fiber executing the effect.

```ts
export declare const sleep: (duration: Duration) => Effect<never, never, void>;
```

### some

Converts an option on values into an option on errors.

```ts
export declare const some: <R, E, A>(self: Effect<R, E, Maybe<A>>) => Effect<R, Maybe<E>, A>;
```

### someOrElse

Extracts the optional value, or returns the given 'orElse'.

```ts
export declare const someOrElse: <B>(orElse: LazyArg<B>) => <R, E, A>(self: Effect<R, E, Maybe<A>>) => Effect<R, E, B | A>;
```

### someOrElseEffect

Extracts the optional value, or executes the effect 'orElse'.

```ts
export declare const someOrElseEffect: <R2, E2, B>(orElse: LazyArg<Effect<R2, E2, B>>) => <R, E, A>(self: Effect<R, E, Maybe<A>>) => Effect<R2 | R, E2 | E, B | A>;
```

### someOrFail

Extracts the optional value, or fails with the given error 'e'.

```ts
export declare const someOrFail: <E2>(orFail: LazyArg<E2>) => <R, E, A>(self: Effect<R, E, Maybe<A>>) => Effect<R, E2 | E, A>;
```

### someOrFailException

Extracts the optional value, or fails with a `NoSuchElement` exception.

```ts
export declare const someOrFailException: <R, E, A>(self: Effect<R, E, Maybe<A>>) => Effect<R, NoSuchElement | E, A>;
```

### someWith

Perfoms the specified operation while "zoomed in" on the `Some` case of an
`Maybe`.

```ts
export declare const someWith: <R, E, A, R1, E1, A1>(f: (effect: Effect<R, Maybe<E>, A>) => Effect<R1, Maybe<E1>, A1>) => (self: Effect<R, E, Maybe<A>>) => Effect<R | R1, E | E1, Maybe<A1>>;
```

### struct

Applicative structure.

```ts
export declare const struct: <NER extends Record<string, Effect<any, any, any>>>(r: Record<string, Effect<any, any, any>> | EnforceNonEmptyRecord<NER>) => Effect<[NER[keyof NER]] extends [{ [EffectURI]: { _R: (_: never) => infer R; }; }] ? R : never, [NER[keyof NER]] extends [{ [EffectURI]: { _E: (_: never) => infer E; }; }] ? E : never, { [K in keyof NER]: [NER[K]] extends [{ [EffectURI]: { _A: (_: never) => infer A; }; }] ? A : never; }>;
```

### structPar

Applicative structure processed in parallel.

```ts
export declare const structPar: <NER extends Record<string, Effect<any, any, any>>>(r: Record<string, Effect<any, any, any>> | EnforceNonEmptyRecord<NER>) => Effect<[NER[keyof NER]] extends [{ [EffectURI]: { _R: (_: never) => infer R; }; }] ? R : never, [NER[keyof NER]] extends [{ [EffectURI]: { _E: (_: never) => infer E; }; }] ? E : never, { [K in keyof NER]: [NER[K]] extends [{ [EffectURI]: { _A: (_: never) => infer A; }; }] ? A : never; }>;
```

### succeed

Returns an effect that models success with the specified value.

```ts
export declare const succeed: <A>(value: A) => Effect<never, never, A>;
```

### succeedLeft

Returns an effect with the value on the left part.

```ts
export declare const succeedLeft: <A>(value: A) => Effect<never, never, Either<A, never>>;
```

### succeedNone

Returns an effect with the empty value.

```ts
export declare const succeedNone: Effect<never, never, Maybe<never>>;
```

### succeedRight

Returns an effect with the value on the right part.

```ts
export declare const succeedRight: <A>(value: A) => Effect<never, never, Either<never, A>>;
```

### succeedSome

Returns an effect with the optional value.

```ts
export declare const succeedSome: <A>(value: A) => Effect<never, never, Maybe<A>>;
```

### summarized

Summarizes a effect by computing some value before and after execution, and
then combining the values to produce a summary, together with the result of
execution.

```ts
export declare const summarized: <R2, E2, B, C>(summary: Effect<R2, E2, B>, f: (start: B, end: B) => C) => <R, E, A>(self: Effect<R, E, A>) => Effect<R2 | R, E2 | E, readonly [C, A]>;
```

### supervised

Returns an effect with the behavior of this one, but where all child fibers
forked in the effect are reported to the specified supervisor.

```ts
export declare const supervised: <X>(supervisor: Supervisor<X>) => <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, A>;
```

### suspend

Returns a lazily constructed effect, whose construction may itself require
effects. When no environment is required (i.e., when `R == unknown`) it is
conceptually equivalent to `flatten(succeed(io))`.

```ts
export declare const suspend: <R, E, A>(f: LazyArg<Effect<R, E, A>>) => Effect<R, unknown, A>;
```

### suspendSucceed

Returns a lazily constructed effect, whose construction may itself require
effects. The effect must not throw any exceptions. When no environment is
required (i.e., when `R == unknown`) it is conceptually equivalent to
`flatten(succeed(effect))`. If you wonder if the effect throws
exceptions, do not use this method, use `suspend`.

```ts
export declare const suspendSucceed: <R, E, A>(effect: LazyArg<Effect<R, E, A>>) => Effect<R, E, A>;
```

### sync

Returns an effect that models success with the specified synchronous
side-effect.

```ts
export declare const sync: <A>(f: LazyArg<A>) => Effect<never, never, A>;
```

### takeWhileEffect

Takes all elements so long as the effectual predicate returns true.

```ts
export declare const takeWhileEffect: <R, E, A>(self: Collection<A>, f: (a: A) => Effect<R, E, boolean>) => Effect<R, E, Chunk<A>>;
```

### tap

Returns an effect that effectfully "peeks" at the success of this effect.

```ts
export declare const tap: <A, R2, E2, X>(f: (a: A) => Effect<R2, E2, X>) => <R, E>(self: Effect<R, E, A>) => Effect<R2 | R, E2 | E, A>;
```

### tapBoth

Returns an effect that effectfully "peeks" at the failure or success of
this effect.

```ts
export declare const tapBoth: <E, A, R2, E2, X, R3, E3, X1>(f: (e: E) => Effect<R2, E2, X>, g: (a: A) => Effect<R3, E3, X1>) => <R>(self: Effect<R, E, A>) => Effect<R2 | R3 | R, E | E2 | E3, A>;
```

### tapDefect

Returns an effect that effectually "peeks" at the defect of this effect.

```ts
export declare const tapDefect: <R2, E2, X>(f: (cause: Cause<never>) => Effect<R2, E2, X>) => <R, E, A>(self: Effect<R, E, A>) => Effect<R2 | R, E2 | E, A>;
```

### tapEither

Returns an effect that effectfully "peeks" at the result of this effect.

```ts
export declare const tapEither: <E, A, R2, E2, X>(f: (either: Either<E, A>) => Effect<R2, E2, X>) => <R>(self: Effect<R, E, A>) => Effect<R2 | R, E | E2, A>;
```

### tapError

Returns an effect that effectfully "peeks" at the failure of this effect.

```ts
export declare const tapError: <E, R2, E2, X>(f: (e: E) => Effect<R2, E2, X>) => <R, A>(self: Effect<R, E, A>) => Effect<R2 | R, E | E2, A>;
```

### tapErrorCause

Returns an effect that effectually "peeks" at the cause of the failure of
this effect.

```ts
export declare const tapErrorCause: <E, R2, E2, X>(f: (cause: Cause<E>) => Effect<R2, E2, X>) => <R, A>(self: Effect<R, E, A>) => Effect<R2 | R, E | E2, A>;
```

### tapSome

Returns an effect that effectfully "peeks" at the success of this effect.
If the partial function isn't defined at the input, the result is
equivalent to the original effect.

```ts
export declare const tapSome: <A, R1, E1, X>(pf: (a: A) => Maybe<Effect<R1, E1, X>>) => <R, E>(self: Effect<R, E, A>) => Effect<R1 | R, E1 | E, A>;
```

### timed

Returns a new effect that executes this one and times the execution.

```ts
export declare const timed: <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, readonly [Duration, A]>;
```

### timedWith

A more powerful variation of `timed` that allows specifying the clock.

```ts
export declare const timedWith: <R1, E1>(milliseconds: Effect<R1, E1, number>) => <R, E, A>(self: Effect<R, E, A>) => Effect<R1 | R, E1 | E, readonly [Duration, A]>;
```

### timeout

Returns an effect that will timeout this effect, returning `None` if the
timeout elapses before the effect has produced a value; and returning
`Some` of the produced value otherwise.

If the timeout elapses without producing a value, the running effect will
be safely interrupted.

WARNING: The effect returned by this method will not itself return until
the underlying effect is actually interrupted. This leads to more
predictable resource utilization. If early return is desired, then instead
of using `effect.timeout(d)`, use `effect.disconnect.timeout(d)`, which
first disconnects the effect's interruption signal before performing the
timeout, resulting in earliest possible return, before an underlying effect
has been successfully interrupted.

```ts
export declare const timeout: (duration: Duration) => <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, Maybe<A>>;
```

### timeoutFail

The same as `timeout`, but instead of producing a `None` in the event of
timeout, it will produce the specified error.

```ts
export declare const timeoutFail: <E1>(e: LazyArg<E1>, duration: Duration) => <R, E, A>(self: Effect<R, E, A>) => Effect<R, E1 | E, A>;
```

### timeoutFailCause

The same as `timeout`, but instead of producing a `None` in the event of
timeout, it will produce the specified failure.

```ts
export declare const timeoutFailCause: <E1>(cause: LazyArg<Cause<E1>>, duration: Duration) => <R, E, A>(self: Effect<R, E, A>) => Effect<R, E1 | E, A>;
```

### timeoutTo

Returns an effect that will timeout this effect, returning either the
default value if the timeout elapses before the effect has produced a
value or returning the result of applying the function `f` to the
success value of the effect.

If the timeout elapses without producing a value, the running effect will
be safely interrupted.

```ts
export declare const timeoutTo: <A, B, B1>(def: B1, f: (a: A) => B, duration: Duration) => <R, E>(self: Effect<R, E, A>) => Effect<R, E, B | B1>;
```

### toLayer

Constructs a layer from this effect.

```ts
export declare const toLayer: <A>(tag: Tag<A>) => <R, E>(self: Effect<R, E, A>) => Layer<R, E, A>;
```

### transplant

Transplants specified effects so that when those effects fork other
effects, the forked effects will be governed by the scope of the fiber that
executes this effect.

This can be used to "graft" deep grandchildren onto a higher-level scope,
effectively extending their lifespans into the parent scope.

```ts
export declare const transplant: <R, E, A>(f: (grafter: Grafter) => Effect<R, E, A>) => Effect<R, E, A>;
```

### tryCatch

Imports a synchronous side-effect into a pure value, translating any
thrown exceptions into typed failed effects.

```ts
export declare const tryCatch: <E, A>(attempt: LazyArg<A>, onThrow: (u: unknown) => E) => Effect<never, E, A>;
```

### tryCatchPromise

Create an `Effect` that when executed will construct `promise` and wait for
its result, errors will be handled using `onReject`.

```ts
export declare const tryCatchPromise: <E, A>(promise: LazyArg<Promise<A>>, onReject: (reason: unknown) => E) => Effect<never, E, A>;
```

### tryOrElse

Executed `that` in case `self` fails with a `Cause` that doesn't contain
defects, executes `success` in case of successes

```ts
export declare const tryOrElse: <R2, E2, A2, A, R3, E3, A3>(that: LazyArg<Effect<R2, E2, A2>>, success: (a: A) => Effect<R3, E3, A3>) => <R, E>(self: Effect<R, E, A>) => Effect<R2 | R3 | R, E2 | E3, A2 | A3>;
```

### tryPromise

Create an `Effect` that when executed will construct `promise` and wait for
its result, errors will produce failure as `unknown`.

```ts
export declare const tryPromise: <A>(promise: LazyArg<Promise<A>>) => Effect<never, unknown, A>;
```

### tuple

Like `forEach` + `identity` with a tuple type.

```ts
export declare const tuple: <T extends NonEmptyArrayEffect>(...t: T & { 0: Effect<any, any, any>; }) => Effect<[T[number]] extends [{ [EffectURI]: { _R: (_: never) => infer R; }; }] ? R : never, [T[number]] extends [{ [EffectURI]: { _E: (_: never) => infer E; }; }] ? E : never, TupleA<T>>;
```

### tuplePar

Like tuple but parallel, same as `forEachPar` + `identity` with a tuple type.

```ts
export declare const tuplePar: <T extends NonEmptyArrayEffect>(...t: T & { 0: Effect<any, any, any>; }) => Effect<[T[number]] extends [{ [EffectURI]: { _R: (_: never) => infer R; }; }] ? R : never, [T[number]] extends [{ [EffectURI]: { _E: (_: never) => infer E; }; }] ? E : never, TupleA<T>>;
```

### uncause

When this effect succeeds with a cause, then this method returns a new
effect that either fails with the cause that this effect succeeded with, or
succeeds with unit, depending on whether the cause is empty.

This operation is the opposite of `cause`.

```ts
export declare const uncause: <R, E>(self: Effect<R, never, Cause<E>>) => Effect<R, E, void>;
```

### unfold

Constructs a `Chunk` by repeatedly applying the effectual function `f` as
long as it returns `Some`.

```ts
export declare const unfold: <A, R, E, S>(s: S, f: (s: S) => Effect<R, E, Maybe<readonly [A, S]>>) => Effect<R, E, Chunk<A>>;
```

### unifyEffect

```ts
export declare const unifyEffect: <X extends Effect<any, any, any>>(self: X) => Effect<[X] extends [{ readonly [EffectURI]: { _R: (_: never) => infer R; }; }] ? R : never, [X] extends [{ readonly [EffectURI]: { _E: (_: never) => infer E; }; }] ? E : never, [X] extends [{ readonly [EffectURI]: { _A: (_: never) => infer A; }; }] ? A : never>;
```

### uninterruptible

```ts
export declare const uninterruptible: <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, A>;
```

### uninterruptibleMask

```ts
export declare const uninterruptibleMask: <R, E, A>(f: (statusRestore: InterruptStatusRestore) => Effect<R, E, A>) => Effect<R, E, A>;
```

### unit

An effect that succeeds with a unit value.

```ts
export declare const unit: Effect<never, never, void>;
```

### unitTraced

An effect that succeeds with a unit value.

```ts
export declare const unitTraced: () => Effect<never, never, void>;
```

### unleft

Converts a `Effect<R, Either<E, B>, A>` into a `Effect<R, E, Either<A, B>>`.
The inverse of `left`.

```ts
export declare const unleft: <R, E, B, A>(self: Effect<R, Either<E, B>, A>) => Effect<R, E, Either<A, B>>;
```

### unless

The moral equivalent of `if (!p) exp`

```ts
export declare const unless: (predicate: LazyArg<boolean>) => <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, Maybe<A>>;
```

### unlessEffect

The moral equivalent of `if (!p) exp` when `p` has side-effects.

```ts
export declare const unlessEffect: <R2, E2>(predicate: Effect<R2, E2, boolean>) => <R, E, A>(self: Effect<R, E, A>) => Effect<R2 | R, E2 | E, Maybe<A>>;
```

### unrefine

Takes some fiber failures and converts them into errors.

```ts
export declare const unrefine: <E1>(pf: (u: unknown) => Maybe<E1>) => <R, E, A>(self: Effect<R, E, A>) => Effect<R, E1 | E, A>;
```

### unrefineWith

Takes some fiber failures and converts them into errors, using the
specified function to convert the `E` into an `E1 | E2`.

```ts
export declare const unrefineWith: <E, E1, E2>(pf: (u: unknown) => Maybe<E1>, f: (e: E) => E2) => <R, A>(self: Effect<R, E, A>) => Effect<R, E1 | E2, A>;
```

### unright

Converts a `Effect<R, Either<B, E>, A>` into a `Effect<R, E, Either<B, A>>`.
The inverse of `right`.

```ts
export declare const unright: <R, B, E, A>(self: Effect<R, Either<B, E>, A>) => Effect<R, E, Either<B, A>>;
```

### unsafeRunAsync

```ts
export declare const unsafeRunAsync: <E, A>(effect: Effect<never, E, A>) => void;
```

### unsafeRunAsyncWith

```ts
export declare const unsafeRunAsyncWith: <E, A>(effect: Effect<never, E, A>, k: (exit: Exit<E, A>) => void) => void;
```

### unsafeRunPromise

```ts
export declare const unsafeRunPromise: <E, A>(effect: Effect<never, E, A>) => Promise<A>;
```

### unsafeRunPromiseExit

```ts
export declare const unsafeRunPromiseExit: <E, A>(effect: Effect<never, E, A>) => Promise<Exit<E, A>>;
```

### unsafeRunSync

```ts
export declare const unsafeRunSync: <E, A>(effect: Effect<never, E, A>) => A;
```

### unsafeRunSyncExit

```ts
export declare const unsafeRunSyncExit: <E, A>(effect: Effect<never, E, A>) => Exit<E, A>;
```

### unsafeRunWith

```ts
export declare const unsafeRunWith: <E, A>(effect: Effect<never, E, A>, k: (exit: Exit<E, A>) => void) => (fiberId: FiberId) => (_: (exit: Exit<E, A>) => void) => void;
```

### unsandbox

The inverse operation `sandbox(effect)`

Terminates with exceptions on the `Left` side of the `Either` error, if it
exists. Otherwise extracts the contained `Effect< R, E, A>`

```ts
export declare const unsandbox: <R, E, A>(self: Effect<R, Cause<E>, A>) => Effect<R, E, A>;
```

### unsome

Converts an option on errors into an option on values.

```ts
export declare const unsome: <R, E, A>(self: Effect<R, Maybe<E>, A>) => Effect<R, E, Maybe<A>>;
```

### updateFiberRefs

Updates the `FiberRef` values for the fiber running this effect using the
specified function.

```ts
export declare const updateFiberRefs: (f: (fiberId: RuntimeFiberId, fiberRefs: FiberRefs) => FiberRefs) => Effect<never, never, void>;
```

### updateRuntimeFlags

Updates the runtime flags. This may have a performance impact. For a
higher-performance variant, see `ZIO#withRuntimeFlags`.

```ts
export declare const updateRuntimeFlags: (patch: RuntimeFlagsPatch) => Effect<never, never, void>;
```

### updateService

Updates the service with the required service entry.

```ts
export declare const updateService: <T, T1 extends T>(tag: Tag<T>, f: (_: T) => T1) => <R, E, A>(self: Effect<R, E, A>) => Effect<T | R, E, A>;
```

### validate

Feeds elements of type `A` to `f` and accumulates all errors in error
channel or successes in success channel.

This combinator is lossy meaning that if there are errors all successes
will be lost. To retain all information please use `partition`.

```ts
export declare const validate: <R, E, A, B>(as: Collection<A>, f: (a: A) => Effect<R, E, B>) => Effect<R, Chunk<E>, Chunk<B>>;
```

### validateDiscard

Feeds elements of type `A` to `f` and accumulates all errors, discarding
the successes.

```ts
export declare const validateDiscard: <R, E, A, X>(as: Collection<A>, f: (a: A) => Effect<R, E, X>) => Effect<R, Chunk<E>, void>;
```

### validateFirst

Feeds elements of type `A` to `f` until it succeeds. Returns first success
or the accumulation of all errors.

```ts
export declare const validateFirst: <R, E, A, B>(as: Collection<A>, f: (a: A) => Effect<R, E, B>) => Effect<R, Chunk<E>, B>;
```

### validateFirstPar

Feeds elements of type `A` to `f` until it succeeds. Returns first success
or the accumulation of all errors.

```ts
export declare const validateFirstPar: <R, E, A, B>(as: Collection<A>, f: (a: A) => Effect<R, E, B>) => Effect<R, Chunk<E>, B>;
```

### validateNow

Sequentially zips the this result with the specified result. Combines both
`Cause<E1>` when both effects fail.

```ts
export declare const validateNow: <R1, E1, B>(that: Effect<R1, E1, B>) => <R, E, A>(self: Effect<R, E, A>) => Effect<R1 | R, E1 | E, readonly [A, B]>;
```

### validatePar

Feeds elements of type `A` to `f `and accumulates, in parallel, all errors
in error channel or successes in success channel.

This combinator is lossy meaning that if there are errors all successes
will be lost. To retain all information please use [[partitionPar]].

```ts
export declare const validatePar: <R, E, A, B>(as: Collection<A>, f: (a: A) => Effect<R, E, B>) => Effect<R, Chunk<E>, Chunk<B>>;
```

### validateParDiscard

Feeds elements of type `A` to `f` in parallel and accumulates all errors,
discarding the successes.

```ts
export declare const validateParDiscard: <R, E, A, X>(as: Collection<A>, f: (a: A) => Effect<R, E, X>) => Effect<R, Chunk<E>, void>;
```

### validateParNow

Returns an effect that executes both this effect and the specified effect,
in parallel. Combines both Cause<E1>` when both effects fail.

```ts
export declare const validateParNow: <R1, E1, B>(that: Effect<R1, E1, B>) => <R, E, A>(self: Effect<R, E, A>) => Effect<R1 | R, E1 | E, readonly [A, B]>;
```

### validateWith

Sequentially zips this effect with the specified effect using the specified
combiner function. Combines the causes in case both effect fail.

```ts
export declare const validateWith: <A, R1, E1, B, C>(that: Effect<R1, E1, B>, f: (a: A, b: B) => C) => <R, E>(self: Effect<R, E, A>) => Effect<R1 | R, E1 | E, C>;
```

### validateWithPar

Returns an effect that executes both this effect and the specified effect,
in parallel, combining their results with the specified `f` function. If
both sides fail, then the cause will be combined.

```ts
export declare const validateWithPar: <A, R1, E1, B, C>(that: Effect<R1, E1, B>, f: (a: A, b: B) => C) => <R, E>(self: Effect<R, E, A>) => Effect<R1 | R, E1 | E, C>;
```

### when

The moral equivalent of `if (p) exp`.

```ts
export declare const when: <R, E, A>(predicate: LazyArg<boolean>, effect: Effect<R, E, A>) => Effect<R, E, Maybe<A>>;
```

### whenCase

Runs an effect when the supplied partial function matches for the given
value, otherwise does nothing.

```ts
export declare const whenCase: <R, E, A, B>(a: LazyArg<A>, pf: (a: A) => Maybe<Effect<R, E, B>>) => Effect<R, E, Maybe<B>>;
```

### whenCaseEffect

Runs an effect when the supplied partial function matches for the given
value, otherwise does nothing.

```ts
export declare const whenCaseEffect: <R, E, A, R1, E1, B>(effect: Effect<R, E, A>, pf: (a: A) => Maybe<Effect<R1, E1, B>>) => Effect<R | R1, E | E1, Maybe<B>>;
```

### whenEffect

The moral equivalent of `if (p) exp` when `p` has side-effects.

```ts
export declare const whenEffect: <R, E, R1, E1, A>(predicate: Effect<R, E, boolean>, effect: Effect<R1, E1, A>) => Effect<R | R1, E | E1, Maybe<A>>;
```

### whileLoop

A low-level while-loop with direct support in the ZIO runtime. The only
reason to use this constructor is performance.

See [[Effect.iterate]] for a user-friendly version of this operator that is
compatible with purely functional code.

```ts
export declare const whileLoop: <R, E, A>(check: LazyArg<boolean>, body: LazyArg<Effect<R, E, A>>, process: (a: A) => void) => Effect<R, E, A>;
```

### withChildren

Locally installs a supervisor and an effect that succeeds with all the
children that have been forked in the returned effect.

```ts
export declare const withChildren: <R, E, A>(get: (children: Effect<never, never, Chunk<Runtime<any, any>>>) => Effect<R, E, A>) => Effect<R, E, A>;
```

### withClock

Executes the specified workflow with the specified implementation of the
clock service.

```ts
export declare const withClock: <C extends Clock>(clock: C) => <R, E, A>(effect: Effect<R, E, A>) => Effect<R, E, A>;
```

### withClockScoped

Sets the implementation of the clock service to the specified value and
restores it to its original value when the scope is closed.

```ts
export declare const withClockScoped: <A extends Clock>(clock: A) => Effect<Scope, never, void>;
```

### withFiberRuntime

Access the fiber runtime that is currently running this fiber.

```ts
export declare const withFiberRuntime: <R, E, A>(onState: (fiber: FiberRuntime<E, A>, status: Running) => Effect<R, E, A>) => Effect<R, E, A>;
```

### withFinalizer

Treats this effect as the acquisition of a resource and adds the
specified finalizer to the current scope. This effect will be run
uninterruptibly and the finalizer will be run when the scope is closed.

```ts
export declare const withFinalizer: <R2, X>(finalizer: Effect<R2, never, X>) => <R, E, A>(self: Effect<R, E, A>) => Effect<Scope | R2 | R, E, A>;
```

### withFinalizerExit

A more powerful variant of `withFinalizer` that allows the finalizer to
depend on the `Exit` value that the scope is closed with.

```ts
export declare const withFinalizerExit: <R2, X>(finalizer: (exit: Exit<unknown, unknown>) => Effect<R2, never, X>) => <R, E, A>(self: Effect<R, E, A>) => Effect<Scope | R2 | R, E, A>;
```

### withParallelism

Runs the specified effect with the specified maximum number of fibers for
parallel operators.

```ts
export declare const withParallelism: (n: number) => <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, A>;
```

### withParallelismUnbounded

Runs the specified effect with an unbounded maximum number of fibers for
parallel operators.

```ts
export declare const withParallelismUnbounded: <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, A>;
```

### withRuntimeFlags

Returns a new Effect that will update the runtime flags according to
the specified patch within the scope of this Effect.

```ts
export declare const withRuntimeFlags: (update: RuntimeFlagsPatch) => <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, A>;
```

### yieldNow

Returns an effect that yields to the runtime system, starting on a fresh
stack. Manual use of this method can improve fairness, at the cost of
overhead.

```ts
export declare const yieldNow: Effect<never, never, void>;
```

### zip

Sequentially zips this effect with the specified effect

```ts
export declare const zip: <R2, E2, A2>(that: Effect<R2, E2, A2>) => <R, E, A>(self: Effect<R, E, A>) => Effect<R2 | R, E2 | E, readonly [A, A2]>;
```

### zipFlatten

Sequentially zips this effect with the specified effect

```ts
export declare const zipFlatten: <R2, E2, A2>(that: Effect<R2, E2, A2>) => <R, E, A extends readonly any[]>(self: Effect<R, E, A>) => Effect<R2 | R, E2 | E, readonly [...A, A2]>;
```

### zipFlattenPar

Sequentially zips this effect with the specified effect

```ts
export declare const zipFlattenPar: <R2, E2, A2>(that: Effect<R2, E2, A2>) => <R, E, A extends readonly any[]>(self: Effect<R, E, A>) => Effect<R2 | R, E2 | E, readonly [...A, A2]>;
```

### zipLeft

Sequences the specified effect after this effect, but ignores the value
produced by the effect.

```ts
export declare const zipLeft: <R2, E2, A2>(that: Effect<R2, E2, A2>) => <R, E, A>(self: Effect<R, E, A>) => Effect<R2 | R, E2 | E, A>;
```

### zipPar

Zips this effect and that effect in parallel.

```ts
export declare const zipPar: <R2, E2, A2>(that: Effect<R2, E2, A2>) => <R, E, A>(self: Effect<R, E, A>) => Effect<R2 | R, E2 | E, readonly [A, A2]>;
```

### zipParLeft

Returns an effect that executes both this effect and the specified effect,
in parallel, this effect result returned. If either side fails, then the
other side will be interrupted.

```ts
export declare const zipParLeft: <R2, E2, A2>(that: Effect<R2, E2, A2>) => <R, E, A>(self: Effect<R, E, A>) => Effect<R2 | R, E2 | E, A>;
```

### zipParRight

Returns an effect that executes both this effect and the specified effect,
in parallel, returning result of provided effect. If either side fails,
then the other side will be interrupted.

```ts
export declare const zipParRight: <R2, E2, A2>(that: Effect<R2, E2, A2>) => <R, E, A>(self: Effect<R, E, A>) => Effect<R2 | R, E2 | E, A2>;
```

### zipRight

A variant of `flatMap` that ignores the value produced by this effect.

```ts
export declare const zipRight: <R2, E2, A2>(that: Effect<R2, E2, A2>) => <R, E, A>(self: Effect<R, E, A>) => Effect<R2 | R, E2 | E, A2>;
```

### zipWith

Sequentially zips this effect with the specified effect using the
specified combiner function.

```ts
export declare const zipWith: <R2, E2, A2, A, B>(that: Effect<R2, E2, A2>, f: (a: A, b: A2) => B) => <R, E>(self: Effect<R, E, A>) => Effect<R2 | R, E2 | E, B>;
```

### zipWithPar

Sequentially zips this effect with the specified effect using the
specified combiner function.

```ts
export declare const zipWithPar: <R2, E2, A2, A, B>(that: Effect<R2, E2, A2>, f: (a: A, b: A2) => B) => <R, E>(self: Effect<R, E, A>) => Effect<R2 | R, E2 | E, B>;
```

