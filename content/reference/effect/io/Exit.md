## Exit

Reference Documentation for the module '@effect/io/Exit'

```ts
export type Exit<E, A> = Success<A> | Failure<E>;
```

## Method

### ap

Applicative's ap.

```ts
export declare const ap: <E, A, B>(that: Exit<E, (a: A) => B>) => (self: Exit<E, A>) => Exit<E, B>;
```

### as

Replaces the success value with the one provided.

```ts
export declare const as: <A1>(value: A1) => <E, A>(self: Exit<E, A>) => Exit<E, A1>;
```

### bind

```ts
export declare const bind: <E, A, K, N extends string>(tag: Exclude<N, keyof K>, f: (_: K) => Exit<E, A>) => <E2>(mk: Exit<E2, K>) => Exit<E | E2, K & { [k in N]: A; }>;
```

### bindValue

```ts
export declare const bindValue: <A, K, N extends string>(tag: Exclude<N, keyof K>, f: (_: K) => A) => <E2>(mk: Exit<E2, K>) => Exit<E2, K & { [k in N]: A; }>;
```

### causeMaybe

Returns an option of the cause of failure.

```ts
export declare const causeMaybe: <E, A>(self: Exit<E, A>) => Maybe<Cause<E>>;
```

### collectAll

```ts
export declare const collectAll: <E, A>(exits: Collection<Exit<E, A>>) => Maybe<Exit<E, List<A>>>;
```

### collectAllPar

```ts
export declare const collectAllPar: <E, A>(exits: Collection<Exit<E, A>>) => Maybe<Exit<E, List<A>>>;
```

### die

```ts
export declare const die: (defect: unknown) => Exit<never, never>;
```

### exists

```ts
export declare const exists: <A>(f: Predicate<A>) => <E>(self: Exit<E, A>) => boolean;
```

### fail

```ts
export declare const fail: <E>(error: E) => Exit<E, never>;
```

### failCause

```ts
export declare const failCause: <E>(cause: Cause<E>) => Exit<E, never>;
```

### flatMap

Flat maps over the value type.

```ts
export declare const flatMap: <A, E1, A1>(f: (a: A) => Exit<E1, A1>) => <E>(self: Exit<E, A>) => Exit<E1 | E, A1>;
```

### flatMapEffect

Effectually flat maps over the value type.

```ts
export declare const flatMapEffect: <E, A, R, E1, A1>(f: (a: A) => Effect<R, E1, Exit<E, A1>>) => (self: Exit<E, A>) => Effect<R, E1, Exit<E, A1>>;
```

### flatten

Flattens an `Exit` of an `Exit` into a single `Exit` value.

```ts
export declare const flatten: <E, E1, A>(self: Exit<E, Exit<E1, A>>) => Exit<E | E1, A>;
```

### fold

Folds over the value or cause.

```ts
export declare const fold: <E, A, Z>(failed: (cause: Cause<E>) => Z, completed: (a: A) => Z) => (self: Exit<E, A>) => Z;
```

### foldEffect

Sequentially zips the this result with the specified result or else returns
the failed `Cause<E>`.

```ts
export declare const foldEffect: <E, A, R1, E1, A1, R2, E2, A2>(failed: (cause: Cause<E>) => Effect<R1, E1, A1>, completed: (a: A) => Effect<R2, E2, A2>) => (self: Exit<E, A>) => Effect<R1 | R2, E1 | E2, A1 | A2>;
```

### forEach

Applies the function `f` to the successful result of the `Exit` and returns
the result in a new `Exit`.

```ts
export declare const forEach: <A, R, E1, B>(f: (a: A) => Effect<R, E1, B>) => <E>(self: Exit<E, A>) => Effect<R, never, Exit<E1 | E, B>>;
```

### fromEither

```ts
export declare const fromEither: <E, A>(e: Either<E, A>) => Exit<E, A>;
```

### fromMaybe

```ts
export declare const fromMaybe: <A>(option: Maybe<A>) => Exit<void, A>;
```

### getOrElse

Retrieves the `A` if succeeded, or else returns the specified default `A`.

```ts
export declare const getOrElse: <E, A>(orElse: (cause: Cause<E>) => A) => (self: Exit<E, A>) => A;
```

### interrupt

```ts
export declare const interrupt: (fiberId: FiberId) => Exit<never, never>;
```

### isFailure

Determines if the `Exit` result is a success.

```ts
export declare const isFailure: <E, A>(self: Exit<E, A>) => self is Failure<E>;
```

### isInterrupted

Determines if the `Exit` result is interrupted.

```ts
export declare const isInterrupted: <E, A>(self: Exit<E, A>) => boolean;
```

### isSuccess

Determines if the `Exit` result is a success.

```ts
export declare const isSuccess: <E, A>(self: Exit<E, A>) => self is Success<A>;
```

### map

Maps over the value type.

```ts
export declare const map: <A, B>(f: (a: A) => B) => <E>(self: Exit<E, A>) => Exit<E, B>;
```

### mapBoth

Maps over both the error and value type.

```ts
export declare const mapBoth: <E, A, E1, A1>(onFailure: (e: E) => E1, onSuccess: (a: A) => A1) => (self: Exit<E, A>) => Exit<E1, A1>;
```

### mapError

Maps over the error type.

```ts
export declare const mapError: <E, E1>(f: (e: E) => E1) => <A>(self: Exit<E, A>) => Exit<E1, A>;
```

### mapErrorCause

Maps over the cause type.

```ts
export declare const mapErrorCause: <E, E1>(f: (cause: Cause<E>) => Cause<E1>) => <A>(self: Exit<E, A>) => Exit<E1, A>;
```

### succeed

```ts
export declare const succeed: <A>(a: A) => Exit<never, A>;
```

### toEffect

Converts the `Exit` to an `Effect`.

```ts
export declare const toEffect: <E, A>(self: Exit<E, A>) => Effect<never, E, A>;
```

### toEither

Converts the `Exit` to an `Either<FiberFailure<E>, A>`, by wrapping the
cause in `FiberFailure` (if the result is failed).

```ts
export declare const toEither: <E, A>(self: Exit<E, A>) => Either<FiberFailure<E>, A>;
```

### unifyExit

```ts
export declare const unifyExit: <X extends Exit<any, any>>(self: X) => Exit<X extends Failure<infer EX> ? EX : never, X extends Success<infer AX> ? AX : never>;
```

### unit

```ts
export declare const unit: Exit<never, void>;
```

### zip

Sequentially zips the this result with the specified result or else returns
the failed `Cause<E>`.

```ts
export declare const zip: <E2, A2>(that: Exit<E2, A2>) => <E, A>(self: Exit<E, A>) => Exit<E2 | E, readonly [A, A2]>;
```

### zipLeft

Sequentially zips the this result with the specified result discarding the
second element of the tuple or else returns the failed `Cause`.

```ts
export declare const zipLeft: <E2, A2>(that: Exit<E2, A2>) => <E, A>(self: Exit<E, A>) => Exit<E2 | E, A>;
```

### zipPar

Parallelly zips the this result with the specified result or else returns
the failed `Cause`.

```ts
export declare const zipPar: <E2, A2>(that: Exit<E2, A2>) => <E, A>(self: Exit<E, A>) => Exit<E2 | E, readonly [A, A2]>;
```

### zipParLeft

Parallelly zips the this result with the specified result discarding the
second element of the tuple or else returns the failed `Cause`.

```ts
export declare const zipParLeft: <E2, A2>(that: Exit<E2, A2>) => <E, A>(self: Exit<E, A>) => Exit<E2 | E, A>;
```

### zipParRight

Parallelly zips the this result with the specified result discarding the
first element of the tuple or else returns the failed `Cause`.

```ts
export declare const zipParRight: <E2, A2>(that: Exit<E2, A2>) => <E, A>(self: Exit<E, A>) => Exit<E2 | E, A2>;
```

### zipRight

Sequentially zips the this result with the specified result discarding the
first element of the tuple or else returns the failed `Cause`.

```ts
export declare const zipRight: <E2, A2>(that: Exit<E2, A2>) => <E, A>(self: Exit<E, A>) => Exit<E2 | E, A2>;
```

### zipWith

Zips this together with the specified result using the combination
functions.

```ts
export declare const zipWith: <E, E1, A, B, C>(that: Exit<E1, B>, f: (a: A, b: B) => C, g: (e: Cause<E>, e1: Cause<E1>) => Cause<E | E1>) => (self: Exit<E, A>) => Exit<E | E1, C>;
```

