## Result

Reference Documentation for the module '@fp-ts/data/Result'

```ts
export declare type Result<E, A> = Failure<E> | Success<A>;
```

## Methods

### ap

```ts
export declare const ap: <E2, A>(fa: Result<E2, A>) => <E1, B>(fab: Result<E1, (a: A) => B>) => Result<E2 | E1, B>;
```

### as

Maps the success value of this effect to the specified constant value.

```ts
export declare const as: <B>(b: B) => <E>(self: Result<E, unknown>) => Result<E, B>;
```

### bind

```ts
export declare const bind: <N extends string, A extends object, E2, B>(name: Exclude<N, keyof A>, f: (a: A) => Result<E2, B>) => <E1>(self: Result<E1, A>) => Result<E2 | E1, { readonly [K in N | keyof A]: K extends keyof A ? A[K] : B; }>;
```

### bindRight

A variant of `bind` that sequentially ignores the scope.

```ts
export declare const bindRight: <N extends string, A extends object, E2, B>(name: Exclude<N, keyof A>, fb: Result<E2, B>) => <E1>(self: Result<E1, A>) => Result<E2 | E1, { readonly [K in N | keyof A]: K extends keyof A ? A[K] : B; }>;
```

### bindTo

```ts
export declare const bindTo: <N extends string>(name: N) => <E, A>(self: Result<E, A>) => Result<E, { readonly [K in N]: A; }>;
```

### catchAll

Recovers from all errors.

```ts
export declare const catchAll: <E1, E2, B>(onError: (e: E1) => Result<E2, B>) => <A>(self: Result<E1, A>) => Result<E2, B | A>;
```

### compact

```ts
export declare const compact: <E>(onNone: E) => <A>(self: Result<E, Option<A>>) => Result<E, A>;
```

### composeKleisli

```ts
export declare const composeKleisli: <B, E2, C>(bfc: (b: B) => Result<E2, C>) => <A, E1>(afb: (a: A) => Result<E1, B>) => (a: A) => Result<E2 | E1, C>;
```

### duplicate

```ts
export declare const duplicate: <E, A>(ma: Result<E, A>) => Result<E, Result<E, A>>;
```

### elem

Tests whether a value is a member of a `Result`.

```ts
export declare const elem: <A>(E: Eq<A>) => (a: A) => <E>(ma: Result<E, A>) => boolean;
```

### exists

Returns `false` if `Failure` or returns the result of the application of the given predicate to the `Success` value.

```ts
export declare const exists: <A>(predicate: Predicate<A>) => (ma: Result<unknown, A>) => boolean;
```

### extend

```ts
export declare const extend: <E, A, B>(f: (wa: Result<E, A>) => B) => (wa: Result<E, A>) => Result<E, B>;
```

### fail

Constructs a new `Result` holding a `Failure` value. This usually represents a failure, due to the right-bias of this
structure.

```ts
export declare const fail: <E>(e: E) => Result<E, never>;
```

### filter

```ts
export declare const filter: { <C extends A, B extends A, E2, A = C>(refinement: Refinement<A, B>, onFalse: E2): <E1>(self: Result<E1, C>) => Result<E2 | E1, B>; <B extends A, E2, A = B>(predicate: Predicate<A>, onFalse: E2): <E1>(self: Result<E1, B>) => Result<E2 | E1, B>; };
```

### filterMap

```ts
export declare const filterMap: <A, B, E>(f: (a: A) => Option<B>, onNone: E) => (self: Result<E, A>) => Result<E, B>;
```

### firstSuccessOf

Returns an effect that runs each of the specified effects in order until one of them succeeds.

```ts
export declare const firstSuccessOf: <E, A>(startWith: Result<E, A>) => (collection: Iterable<Result<E, A>>) => Result<E, A>;
```

### flap

```ts
export declare const flap: <A>(a: A) => <E, B>(fab: Result<E, (a: A) => B>) => Result<E, B>;
```

### flatMap

```ts
export declare const flatMap: <A, E2, B>(f: (a: A) => Result<E2, B>) => <E1>(self: Result<E1, A>) => Result<E2 | E1, B>;
```

### flatMapNullable

```ts
export declare const flatMapNullable: <A, B, E2>(f: (a: A) => B, onNullable: E2) => <E1>(self: Result<E1, A>) => Result<E2 | E1, NonNullable<B>>;
```

### flatMapOption

```ts
export declare const flatMapOption: <A, B, E2>(f: (a: A) => Option<B>, onNone: E2) => <E1>(self: Result<E1, A>) => Result<E2 | E1, B>;
```

### flatten

The `flatten` function is the conventional monad join operator. It is used to remove one level of monadic structure, projecting its bound argument into the outer level.

```ts
export declare const flatten: <E1, E2, A>(mma: Result<E1, Result<E2, A>>) => Result<E1 | E2, A>;
```

### foldMap

```ts
export declare const foldMap: <M>(Monoid: Monoid<M>) => <A>(f: (a: A) => M) => <E>(self: Result<E, A>) => M;
```

### fromNullable

Takes a lazy default and a nullable value, if the value is not nully, turn it into a `Success`, if the value is nully use
the provided default as a `Failure`.

```ts
export declare const fromNullable: <E>(onNullable: E) => <A>(a: A) => Result<E, NonNullable<A>>;
```

### fromOption

```ts
export declare const fromOption: <E>(onNone: E) => <A>(fa: Option<A>) => Result<E, A>;
```

### fromThrowable

Constructs a new `Result` from a function that might throw.

```ts
export declare const fromThrowable: <A, E>(f: () => A, onThrow: (error: unknown) => E) => Result<E, A>;
```

### getCompactable

```ts
export declare const getCompactable: <E>(onNone: E) => Compactable<ValidatedT<ResultTypeLambda, E>>;
```

### getEq

```ts
export declare const getEq: <E, A>(EE: Eq<E>, EA: Eq<A>) => Eq<Result<E, A>>;
```

### getFailure

Converts a `Result` to an `Option` discarding the success.

```ts
export declare const getFailure: <E, A>(self: Result<E, A>) => Option<E>;
```

### getFilterable

```ts
export declare const getFilterable: <E>(onEmpty: E) => Filterable<ValidatedT<ResultTypeLambda, E>>;
```

### getOrElse

Returns the wrapped value if it's a `Success` or a default value if is a `Failure`.

```ts
export declare const getOrElse: <B>(onError: B) => <A>(self: Result<unknown, A>) => B | A;
```

### getSemigroup

Semigroup returning the left-most non-`Failure` value. If both operands are `Success`es then the inner values are
combined using the provided `Semigroup`.

```ts
export declare const getSemigroup: <A, E>(S: Semigroup<A>) => Semigroup<Result<E, A>>;
```

### getShow

```ts
export declare const getShow: <E, A>(SE: Show<E>, SA: Show<A>) => Show<Result<E, A>>;
```

### getSuccess

Converts a `Result` to an `Option` discarding the error.

```ts
export declare const getSuccess: <E, A>(self: Result<E, A>) => Option<A>;
```

### getTraversableFilterable

```ts
export declare const getTraversableFilterable: <E>(onEmpty: E) => TraversableFilterable<ValidatedT<ResultTypeLambda, E>>;
```

### getValidatedAlt

The default [`Alt`](#semigroupkind) instance returns the last error, if you want to
get all errors you need to provide a way to combine them via a `Semigroup`.

```ts
export declare const getValidatedAlt: <E>(Semigroup: Semigroup<E>) => Alt<ValidatedT<ResultTypeLambda, E>>;
```

### getValidatedApplicative

The default [`Applicative`](#applicative) instance returns the first error, if you want to
get all errors you need to provide a way to combine them via a `Semigroup`.

```ts
export declare const getValidatedApplicative: <E>(Semigroup: Semigroup<E>) => Applicative<ValidatedT<ResultTypeLambda, E>>;
```

### idKleisli

```ts
export declare const idKleisli: <A>() => (a: A) => Result<never, A>;
```

### isFailure

Returns `true` if the either is an instance of `Failure`, `false` otherwise.

```ts
export declare const isFailure: <E, A>(self: Result<E, A>) => self is Failure<E>;
```

### isSuccess

Returns `true` if the either is an instance of `Success`, `false` otherwise.

```ts
export declare const isSuccess: <E, A>(self: Result<E, A>) => self is Success<A>;
```

### let

```ts
export declare const let: <N extends string, A extends object, B>(name: Exclude<N, keyof A>, f: (a: A) => B) => <E>(self: Result<E, A>) => Result<E, { readonly [K in N | keyof A]: K extends keyof A ? A[K] : B; }>;
```

### lift2

Lifts a binary function into `Result`.

```ts
export declare const lift2: <A, B, C>(f: (a: A, b: B) => C) => <E1, E2>(fa: Result<E1, A>, fb: Result<E2, B>) => Result<E1 | E2, C>;
```

### lift3

Lifts a ternary function into `Result`.

```ts
export declare const lift3: <A, B, C, D>(f: (a: A, b: B, c: C) => D) => <E1, E2, E3>(fa: Result<E1, A>, fb: Result<E2, B>, fc: Result<E3, C>) => Result<E1 | E2 | E3, D>;
```

### liftNullable

```ts
export declare const liftNullable: <A extends readonly unknown[], B, E>(f: (...a: A) => B, onNullable: E) => (...a: A) => Result<E, NonNullable<B>>;
```

### liftOption

```ts
export declare const liftOption: <A extends readonly unknown[], B, E>(f: (...a: A) => Option<B>, onNone: E) => (...a: A) => Result<E, B>;
```

### liftPredicate

```ts
export declare const liftPredicate: { <C extends A, B extends A, E, A = C>(refinement: Refinement<A, B>, onFalse: E): (c: C) => Result<E, B>; <B extends A, E, A = B>(predicate: Predicate<A>, onFalse: E): (b: B) => Result<E, B>; };
```

### liftThrowable

Lifts a function that may throw to one returning a `Result`.

```ts
export declare const liftThrowable: <A extends readonly unknown[], B, E>(f: (...a: A) => B, onThrow: (error: unknown) => E) => (...a: A) => Result<E, B>;
```

### map

Returns an effect whose success is mapped by the specified `f` function.

```ts
export declare const map: <A, B>(f: (a: A) => B) => <E>(fa: Result<E, A>) => Result<E, B>;
```

### mapBoth

Returns an effect whose failure and success channels have been mapped by
the specified pair of functions, `f` and `g`.

```ts
export declare const mapBoth: <E, G, A, B>(f: (e: E) => G, g: (a: A) => B) => (self: Result<E, A>) => Result<G, B>;
```

### mapError

Returns an effect with its error channel mapped using the specified
function. This can be used to lift a "smaller" error into a "larger" error.

```ts
export declare const mapError: <E, G>(f: (e: E) => G) => <A>(self: Result<E, A>) => Result<G, A>;
```

### match

Takes two functions and an `Result` value, if the value is a `Failure` the inner value is applied to the first function,
if the value is a `Success` the inner value is applied to the second function.

```ts
export declare const match: <E, B, A, C = B>(onError: (e: E) => B, onSuccess: (a: A) => C) => (self: Result<E, A>) => B | C;
```

### orElse

Identifies an associative operation on a type constructor. It is similar to `Semigroup`, except that it applies to
types of kind `* -> *`.

In case of `Result` returns the left-most non-`Failure` value (or the right-most `Failure` value if both values are `Failure`).

| x          | y          | pipe(x, orElse(y) |
| ---------- | ---------- | ------------------|
| fail(a)    | fail(b)    | fail(b)           |
| fail(a)    | succeed(2) | succeed(2)        |
| succeed(1) | fail(b)    | succeed(1)        |
| succeed(1) | succeed(2) | succeed(1)        |

```ts
export declare const orElse: <E2, B>(that: Result<E2, B>) => <E1, A>(self: Result<E1, A>) => Result<E2, B | A>;
```

### partition

```ts
export declare const partition: { <C extends A, B extends A, E, A = C>(refinement: Refinement<A, B>, onFalse: E): (self: Result<E, C>) => readonly [Result<E, C>, Result<E, B>]; <B extends A, E, A = B>(predicate: Predicate<A>, onFalse: E): (self: Result<E, B>) => readonly [Result<E, B>, Result<E, B>]; };
```

### partitionMap

```ts
export declare const partitionMap: <A, B, C, E>(f: (a: A) => Result<B, C>, onEmpty: E) => (self: Result<E, A>) => readonly [Result<E, B>, Result<E, C>];
```

### reduce

```ts
export declare const reduce: <B, A>(b: B, f: (b: B, a: A) => B) => <E>(self: Result<E, A>) => B;
```

### reduceRight

```ts
export declare const reduceRight: <B, A>(b: B, f: (a: A, b: B) => B) => <E>(self: Result<E, A>) => B;
```

### reverse

```ts
export declare const reverse: <E, A>(ma: Result<E, A>) => Result<A, E>;
```

### separate

```ts
export declare const separate: <E>(onEmpty: E) => <A, B>(self: Result<E, Result<A, B>>) => readonly [Result<E, A>, Result<E, B>];
```

### sequence

```ts
export declare const sequence: <F extends TypeLambda>(F: Applicative<F>) => <E, FS, FR, FO, FE, A>(fa: Result<E, Kind<F, FS, FR, FO, FE, A>>) => Kind<F, FS, FR, FO, FE, Result<E, A>>;
```

### sequenceReadonlyArray

Equivalent to `ReadonlyArray#sequence(Applicative)`.

```ts
export declare const sequenceReadonlyArray: <E, A>(arr: readonly Result<E, A>[]) => Result<E, readonly A[]>;
```

### succeed

Constructs a new `Result` holding a `Success` value. This usually represents a successful value due to the right bias
of this structure.

```ts
export declare const succeed: <A>(a: A) => Result<never, A>;
```

### tap

Returns an effect that effectfully "peeks" at the success of this effect.

```ts
export declare const tap: <A, E2>(f: (a: A) => Result<E2, unknown>) => <E1>(self: Result<E1, A>) => Result<E2 | E1, A>;
```

### tapError

Returns an effect that effectfully "peeks" at the failure of this effect.

```ts
export declare const tapError: <E1, E2>(onError: (e: E1) => Result<E2, unknown>) => <A>(self: Result<E1, A>) => Result<E1 | E2, A>;
```

### toNull

```ts
export declare const toNull: <E, A>(self: Result<E, A>) => A;
```

### toReadonlyArray

```ts
export declare const toReadonlyArray: <E, A>(self: Result<E, A>) => readonly A[];
```

### toUndefined

```ts
export declare const toUndefined: <E, A>(self: Result<E, A>) => A;
```

### toUnion

```ts
export declare const toUnion: <E, A>(fa: Result<E, A>) => E | A;
```

### traverse

Map each element of a structure to an action, evaluate these actions from left to right, and collect the results.

```ts
export declare const traverse: <F extends TypeLambda>(F: Applicative<F>) => <A, FS, FR, FO, FE, B>(f: (a: A) => Kind<F, FS, FR, FO, FE, B>) => <E>(ta: Result<E, A>) => Kind<F, FS, FR, FO, FE, Result<E, B>>;
```

### traverseFilterMap

```ts
export declare const traverseFilterMap: <F extends TypeLambda>(Applicative: Applicative<F>) => <A, S, R, O, FE, B, E>(f: (a: A) => Kind<F, S, R, O, FE, Option<B>>, onNone: E) => (self: Result<E, A>) => Kind<F, S, R, O, FE, Result<E, B>>;
```

### traverseNonEmptyReadonlyArray

Equivalent to `NonEmptyReadonlyArray#traverse(Apply)`.

```ts
export declare const traverseNonEmptyReadonlyArray: <A, E, B>(f: (a: A) => Result<E, B>) => (as: readonly [A, ...A[]]) => Result<E, readonly [B, ...B[]]>;
```

### traverseNonEmptyReadonlyArrayWithIndex

Equivalent to `NonEmptyReadonlyArray#traverseWithIndex(Apply)`.

```ts
export declare const traverseNonEmptyReadonlyArrayWithIndex: <A, E, B>(f: (index: number, a: A) => Result<E, B>) => (as: readonly [A, ...A[]]) => Result<E, readonly [B, ...B[]]>;
```

### traversePartitionMap

```ts
export declare const traversePartitionMap: <F extends TypeLambda>(Applicative: Applicative<F>) => <A, S, R, O, FE, B, C, E>(f: (a: A) => Kind<F, S, R, O, FE, Result<B, C>>, onNone: E) => (self: Result<E, A>) => Kind<F, S, R, O, FE, readonly [Result<E, B>, Result<E, C>]>;
```

### traverseReadonlyArray

Equivalent to `ReadonlyArray#traverse(Applicative)`.

```ts
export declare const traverseReadonlyArray: <A, E, B>(f: (a: A) => Result<E, B>) => (as: readonly A[]) => Result<E, readonly B[]>;
```

### traverseReadonlyArrayWithIndex

Equivalent to `ReadonlyArray#traverseWithIndex(Applicative)`.

```ts
export declare const traverseReadonlyArrayWithIndex: <A, E, B>(f: (index: number, a: A) => Result<E, B>) => (as: readonly A[]) => Result<E, readonly B[]>;
```

### tupled

```ts
export declare const tupled: <E, A>(self: Result<E, A>) => Result<E, readonly [A]>;
```

### unit

Returns the effect resulting from mapping the success of this effect to unit.

```ts
export declare const unit: <E>(self: Result<E, unknown>) => Result<E, void>;
```

### zipFlatten

Sequentially zips this effect with the specified effect.

```ts
export declare const zipFlatten: <E2, B>(fb: Result<E2, B>) => <E1, A extends readonly unknown[]>(self: Result<E1, A>) => Result<E2 | E1, readonly [...A, B]>;
```

### zipLeft

Sequences the specified effect after this effect, but ignores the value
produced by the effect.

```ts
export declare const zipLeft: <E2>(that: Result<E2, unknown>) => <E1, A>(self: Result<E1, A>) => Result<E2 | E1, A>;
```

### zipRight

A variant of `flatMap` that ignores the value produced by this effect.

```ts
export declare const zipRight: <E2, A>(that: Result<E2, A>) => <E1>(self: Result<E1, unknown>) => Result<E2 | E1, A>;
```

### zipWith

Sequentially zips this effect with the specified effect using the specified combiner function.

```ts
export declare const zipWith: <E2, B, A, C>(that: Result<E2, B>, f: (a: A, b: B) => C) => <E1>(self: Result<E1, A>) => Result<E2 | E1, C>;
```

