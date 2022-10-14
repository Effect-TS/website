## Exit

Reference Documentation for the module '@effect/core/io/Exit'

```ts
export type Exit<E, A> = Success<A> | Failure<E>;
```

## Methods

### ap

Applicative's ap.

```ts
/**
 * @tsplus static effect/core/io/Exit.Aspects ap
 * @tsplus pipeable effect/core/io/Exit ap
 */
export declare const ap: <E, A, B>(that: Exit<E, (a: A) => B>) => (self: Exit<E, A>) => Exit<E, B>;
```

### as

Replaces the success value with the one provided.

```ts
/**
 * @tsplus static effect/core/io/Exit.Aspects as
 * @tsplus pipeable effect/core/io/Exit as
 */
export declare const as: <A1>(value: A1) => <E, A>(self: Exit<E, A>) => Exit<E, A1>;
```

### bind

```ts
/**
 * @tsplus static effect/core/io/Exit.Aspects bind
 * @tsplus pipeable effect/core/io/Exit bind
 */
export declare const bind: <E, A, K, N extends string>(tag: Exclude<N, keyof K>, f: (_: K) => Exit<E, A>) => <E2>(mk: Exit<E2, K>) => Exit<E | E2, K & { [k in N]: A; }>;
```

### bindValue

```ts
/**
 * @tsplus static effect/core/io/Exit.Aspects bindValue
 * @tsplus pipeable effect/core/io/Exit bindValue
 */
export declare const bindValue: <A, K, N extends string>(tag: Exclude<N, keyof K>, f: (_: K) => A) => <E2>(mk: Exit<E2, K>) => Exit<E2, K & { [k in N]: A; }>;
```

### causeMaybe

Returns an option of the cause of failure.

```ts
/**
 * @tsplus getter effect/core/io/Exit causeMaybe
 */
export declare const causeMaybe: <E, A>(self: Exit<E, A>) => Maybe<Cause<E>>;
```

### collectAll

```ts
/**
 * @tsplus static effect/core/io/Exit.Ops collectAll
 */
export declare const collectAll: <E, A>(exits: Collection<Exit<E, A>>) => Maybe<Exit<E, List<A>>>;
```

### collectAllPar

```ts
/**
 * @tsplus static effect/core/io/Exit.Ops collectAllPar
 */
export declare const collectAllPar: <E, A>(exits: Collection<Exit<E, A>>) => Maybe<Exit<E, List<A>>>;
```

### die

```ts
/**
 * @tsplus static effect/core/io/Exit.Ops die
 */
export declare const die: (defect: unknown) => Exit<never, never>;
```

### exists

```ts
/**
 * @tsplus static effect/core/io/Exit.Aspects exists
 * @tsplus pipeable effect/core/io/Exit exists
 */
export declare const exists: <A>(f: Predicate<A>) => <E>(self: Exit<E, A>) => boolean;
```

### fail

```ts
/**
 * @tsplus static effect/core/io/Exit.Ops fail
 */
export declare const fail: <E>(error: E) => Exit<E, never>;
```

### failCause

```ts
/**
 * @tsplus static effect/core/io/Exit.Ops failCause
 */
export declare const failCause: <E>(cause: Cause<E>) => Exit<E, never>;
```

### flatMap

Flat maps over the value type.

```ts
/**
 * @tsplus static effect/core/io/Exit.Aspects flatMap
 * @tsplus pipeable effect/core/io/Exit flatMap
 */
export declare const flatMap: <A, E1, A1>(f: (a: A) => Exit<E1, A1>) => <E>(self: Exit<E, A>) => Exit<E1 | E, A1>;
```

### flatMapEffect

Effectually flat maps over the value type.

```ts
/**
 * @tsplus static effect/core/io/Exit.Aspects flatMapEffect
 * @tsplus pipeable effect/core/io/Exit flatMapEffect
 */
export declare const flatMapEffect: <E, A, R, E1, A1>(f: (a: A) => Effect<R, E1, Exit<E, A1>>) => (self: Exit<E, A>) => Effect<R, E1, Exit<E, A1>>;
```

### flatten

Flattens an `Exit` of an `Exit` into a single `Exit` value.

```ts
/**
 * @tsplus getter effect/core/io/Exit flatten
 */
export declare const flatten: <E, E1, A>(self: Exit<E, Exit<E1, A>>) => Exit<E | E1, A>;
```

### fold

Folds over the value or cause.

```ts
/**
 * @tsplus static effect/core/io/Exit.Aspects fold
 * @tsplus pipeable effect/core/io/Exit fold
 */
export declare const fold: <E, A, Z>(failed: (cause: Cause<E>) => Z, completed: (a: A) => Z) => (self: Exit<E, A>) => Z;
```

### foldEffect

Sequentially zips the this result with the specified result or else returns
the failed `Cause<E>`.

```ts
/**
 * @tsplus static effect/core/io/Exit.Aspects foldEffect
 * @tsplus pipeable effect/core/io/Exit foldEffect
 */
export declare const foldEffect: <E, A, R1, E1, A1, R2, E2, A2>(failed: (cause: Cause<E>) => Effect<R1, E1, A1>, completed: (a: A) => Effect<R2, E2, A2>) => (self: Exit<E, A>) => Effect<R1 | R2, E1 | E2, A1 | A2>;
```

### forEach

Applies the function `f` to the successful result of the `Exit` and returns
the result in a new `Exit`.

```ts
/**
 * @tsplus static effect/core/io/Exit.Aspects forEach
 * @tsplus pipeable effect/core/io/Exit forEach
 */
export declare const forEach: <A, R, E1, B>(f: (a: A) => Effect<R, E1, B>) => <E>(self: Exit<E, A>) => Effect<R, never, Exit<E1 | E, B>>;
```

### fromEither

```ts
/**
 * @tsplus static effect/core/io/Exit.Ops fromEither
 */
export declare const fromEither: <E, A>(e: Either<E, A>) => Exit<E, A>;
```

### fromMaybe

```ts
/**
 * @tsplus static effect/core/io/Exit.Ops fromMaybe
 */
export declare const fromMaybe: <A>(option: Maybe<A>) => Exit<void, A>;
```

### getOrElse

Retrieves the `A` if succeeded, or else returns the specified default `A`.

```ts
/**
 * @tsplus static effect/core/io/Exit.Aspects getOrElse
 * @tsplus pipeable effect/core/io/Exit getOrElse
 */
export declare const getOrElse: <E, A>(orElse: (cause: Cause<E>) => A) => (self: Exit<E, A>) => A;
```

### interrupt

```ts
/**
 * @tsplus static effect/core/io/Exit.Ops interrupt
 */
export declare const interrupt: (fiberId: FiberId) => Exit<never, never>;
```

### isFailure

Determines if the `Exit` result is a success.

```ts
/**
 * @tsplus fluent effect/core/io/Exit isFailure
 */
export declare const isFailure: <E, A>(self: Exit<E, A>) => self is Failure<E>;
```

### isInterrupted

Determines if the `Exit` result is interrupted.

```ts
/**
 * @tsplus getter effect/core/io/Exit isInterrupted
 */
export declare const isInterrupted: <E, A>(self: Exit<E, A>) => boolean;
```

### isSuccess

Determines if the `Exit` result is a success.

```ts
/**
 * @tsplus fluent effect/core/io/Exit isSuccess
 */
export declare const isSuccess: <E, A>(self: Exit<E, A>) => self is Success<A>;
```

### map

Maps over the value type.

```ts
/**
 * @tsplus static effect/core/io/Exit.Aspects map
 * @tsplus pipeable effect/core/io/Exit map
 */
export declare const map: <A, B>(f: (a: A) => B) => <E>(self: Exit<E, A>) => Exit<E, B>;
```

### mapBoth

Maps over both the error and value type.

```ts
/**
 * @tsplus static effect/core/io/Exit.Aspects mapBoth
 * @tsplus pipeable effect/core/io/Exit mapBoth
 */
export declare const mapBoth: <E, A, E1, A1>(onFailure: (e: E) => E1, onSuccess: (a: A) => A1) => (self: Exit<E, A>) => Exit<E1, A1>;
```

### mapError

Maps over the error type.

```ts
/**
 * @tsplus static effect/core/io/Exit.Aspects mapError
 * @tsplus pipeable effect/core/io/Exit mapError
 */
export declare const mapError: <E, E1>(f: (e: E) => E1) => <A>(self: Exit<E, A>) => Exit<E1, A>;
```

### mapErrorCause

Maps over the cause type.

```ts
/**
 * @tsplus static effect/core/io/Exit.Aspects mapErrorCause
 * @tsplus pipeable effect/core/io/Exit mapErrorCause
 */
export declare const mapErrorCause: <E, E1>(f: (cause: Cause<E>) => Cause<E1>) => <A>(self: Exit<E, A>) => Exit<E1, A>;
```

### succeed

```ts
/**
 * @tsplus static effect/core/io/Exit.Ops succeed
 */
export declare const succeed: <A>(a: A) => Exit<never, A>;
```

### toEffect

Converts the `Exit` to an `Effect`.

```ts
/**
 * @tsplus getter effect/core/io/Exit toEffect
 */
export declare const toEffect: <E, A>(self: Exit<E, A>) => Effect<never, E, A>;
```

### toEither

Converts the `Exit` to an `Either<FiberFailure<E>, A>`, by wrapping the
cause in `FiberFailure` (if the result is failed).

```ts
/**
 * @tsplus getter effect/core/io/Exit toEither
 */
export declare const toEither: <E, A>(self: Exit<E, A>) => Either<FiberFailure<E>, A>;
```

### unifyExit

```ts
/**
 * @tsplus unify effect/core/io/Exit/Success
 * @tsplus unify effect/core/io/Exit/Failure
 */
export declare const unifyExit: <X extends Exit<any, any>>(self: X) => Exit<X extends Failure<infer EX> ? EX : never, X extends Success<infer AX> ? AX : never>;
```

### unit

```ts
/**
 * @tsplus static effect/core/io/Exit.Ops unit
 */
export declare const unit: Exit<never, void>;
```

### zip

Sequentially zips the this result with the specified result or else returns
the failed `Cause<E>`.

```ts
/**
 * @tsplus static effect/core/io/Exit.Aspects zip
 * @tsplus pipeable effect/core/io/Exit zip
 */
export declare const zip: <E2, A2>(that: Exit<E2, A2>) => <E, A>(self: Exit<E, A>) => Exit<E2 | E, readonly [A, A2]>;
```

### zipLeft

Sequentially zips the this result with the specified result discarding the
second element of the tuple or else returns the failed `Cause`.

```ts
/**
 * @tsplus operator effect/core/io/Exit <
 * @tsplus static effect/core/io/Exit.Aspects zipLeft
 * @tsplus pipeable effect/core/io/Exit zipLeft
 */
export declare const zipLeft: <E2, A2>(that: Exit<E2, A2>) => <E, A>(self: Exit<E, A>) => Exit<E2 | E, A>;
```

### zipPar

Parallelly zips the this result with the specified result or else returns
the failed `Cause`.

```ts
/**
 * @tsplus static effect/core/io/Exit.Aspects zipPar
 * @tsplus pipeable effect/core/io/Exit zipPar
 */
export declare const zipPar: <E2, A2>(that: Exit<E2, A2>) => <E, A>(self: Exit<E, A>) => Exit<E2 | E, readonly [A, A2]>;
```

### zipParLeft

Parallelly zips the this result with the specified result discarding the
second element of the tuple or else returns the failed `Cause`.

```ts
/**
 * @tsplus static effect/core/io/Exit.Aspects zipParLeft
 * @tsplus pipeable effect/core/io/Exit zipParLeft
 */
export declare const zipParLeft: <E2, A2>(that: Exit<E2, A2>) => <E, A>(self: Exit<E, A>) => Exit<E2 | E, A>;
```

### zipParRight

Parallelly zips the this result with the specified result discarding the
first element of the tuple or else returns the failed `Cause`.

```ts
/**
 * @tsplus static effect/core/io/Exit.Aspects zipParRight
 * @tsplus pipeable effect/core/io/Exit zipParRight
 */
export declare const zipParRight: <E2, A2>(that: Exit<E2, A2>) => <E, A>(self: Exit<E, A>) => Exit<E2 | E, A2>;
```

### zipRight

Sequentially zips the this result with the specified result discarding the
first element of the tuple or else returns the failed `Cause`.

```ts
/**
 * @tsplus pipeable-operator effect/core/io/Exit >
 * @tsplus static effect/core/io/Exit.Aspects zipRight
 * @tsplus pipeable effect/core/io/Exit zipRight
 */
export declare const zipRight: <E2, A2>(that: Exit<E2, A2>) => <E, A>(self: Exit<E, A>) => Exit<E2 | E, A2>;
```

### zipWith

Zips this together with the specified result using the combination
functions.

```ts
/**
 * @tsplus static effect/core/io/Exit.Aspects zipWith
 * @tsplus pipeable effect/core/io/Exit zipWith
 */
export declare const zipWith: <E, E1, A, B, C>(that: Exit<E1, B>, f: (a: A, b: B) => C, g: (e: Cause<E>, e1: Cause<E1>) => Cause<E | E1>) => (self: Exit<E, A>) => Exit<E | E1, C>;
```

