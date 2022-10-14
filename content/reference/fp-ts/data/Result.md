## Result

Reference Documentation for the module '@fp-ts/data/Result'

```ts
export declare type Result<E, A> = Failure<E> | Success<A>;
```

## Methods

### ap

```ts
/**
 * @since 3.0.0
 */
export declare const ap: <E2, A>(fa: Result<E2, A>) => <E1, B>(fab: Result<E1, (a: A) => B>) => Result<E2 | E1, B>;
```

### as

Maps the success value of this effect to the specified constant value.

```ts
/**
 * @category mapping
 * @since 3.0.0
 */
export declare const as: <B>(b: B) => <E>(self: Result<E, unknown>) => Result<E, B>;
```

### bind

```ts
/**
 * @category do notation
 * @since 3.0.0
 */
export declare const bind: <N extends string, A extends object, E2, B>(name: Exclude<N, keyof A>, f: (a: A) => Result<E2, B>) => <E1>(self: Result<E1, A>) => Result<E2 | E1, { readonly [K in N | keyof A]: K extends keyof A ? A[K] : B; }>;
```

### bindRight

A variant of `bind` that sequentially ignores the scope.

```ts
/**
 * @category do notation
 * @since 3.0.0
 */
export declare const bindRight: <N extends string, A extends object, E2, B>(name: Exclude<N, keyof A>, fb: Result<E2, B>) => <E1>(self: Result<E1, A>) => Result<E2 | E1, { readonly [K in N | keyof A]: K extends keyof A ? A[K] : B; }>;
```

### bindTo

```ts
/**
 * @category do notation
 * @since 3.0.0
 */
export declare const bindTo: <N extends string>(name: N) => <E, A>(self: Result<E, A>) => Result<E, { readonly [K in N]: A; }>;
```

### catchAll

Recovers from all errors.

```ts
/**
 * @category error handling
 * @since 3.0.0
 */
export declare const catchAll: <E1, E2, B>(onError: (e: E1) => Result<E2, B>) => <A>(self: Result<E1, A>) => Result<E2, B | A>;
```

### compact

```ts
/**
 * @category filtering
 * @since 3.0.0
 */
export declare const compact: <E>(onNone: E) => <A>(self: Result<E, Option<A>>) => Result<E, A>;
```

### composeKleisli

```ts
/**
 * @since 3.0.0
 */
export declare const composeKleisli: <B, E2, C>(bfc: (b: B) => Result<E2, C>) => <A, E1>(afb: (a: A) => Result<E1, B>) => (a: A) => Result<E2 | E1, C>;
```

### duplicate

```ts
/**
 * @since 3.0.0
 */
export declare const duplicate: <E, A>(ma: Result<E, A>) => Result<E, Result<E, A>>;
```

### elem

Tests whether a value is a member of a `Result`.

```ts
/**
 * @since 3.0.0
 */
export declare const elem: <A>(E: Eq<A>) => (a: A) => <E>(ma: Result<E, A>) => boolean;
```

### exists

Returns `false` if `Failure` or returns the result of the application of the given predicate to the `Success` value.

```ts
/**
 * @since 3.0.0
 */
export declare const exists: <A>(predicate: Predicate<A>) => (ma: Result<unknown, A>) => boolean;
```

### extend

```ts
/**
 * @since 3.0.0
 */
export declare const extend: <E, A, B>(f: (wa: Result<E, A>) => B) => (wa: Result<E, A>) => Result<E, B>;
```

### fail

Constructs a new `Result` holding a `Failure` value. This usually represents a failure, due to the right-bias of this
structure.

```ts
/**
 * @category constructors
 * @since 3.0.0
 */
export declare const fail: <E>(e: E) => Result<E, never>;
```

### filter

```ts
/**
 * @category filtering
 * @since 3.0.0
 */
export declare const filter: { <C extends A, B extends A, E2, A = C>(refinement: Refinement<A, B>, onFalse: E2): <E1>(self: Result<E1, C>) => Result<E2 | E1, B>; <B extends A, E2, A = B>(predicate: Predicate<A>, onFalse: E2): <E1>(self: Result<E1, B>) => Result<E2 | E1, B>; };
```

### filterMap

```ts
/**
 * @category filtering
 * @since 3.0.0
 */
export declare const filterMap: <A, B, E>(f: (a: A) => Option<B>, onNone: E) => (self: Result<E, A>) => Result<E, B>;
```

### firstSuccessOf

Returns an effect that runs each of the specified effects in order until one of them succeeds.

```ts
/**
 * @category error handling
 * @since 3.0.0
 */
export declare const firstSuccessOf: <E, A>(startWith: Result<E, A>) => (collection: Iterable<Result<E, A>>) => Result<E, A>;
```

### flap

```ts
/**
 * @category mapping
 * @since 3.0.0
 */
export declare const flap: <A>(a: A) => <E, B>(fab: Result<E, (a: A) => B>) => Result<E, B>;
```

### flatMap

```ts
/**
 * @category sequencing
 * @since 3.0.0
 */
export declare const flatMap: <A, E2, B>(f: (a: A) => Result<E2, B>) => <E1>(self: Result<E1, A>) => Result<E2 | E1, B>;
```

### flatMapNullable

```ts
/**
 * @category sequencing
 * @since 3.0.0
 */
export declare const flatMapNullable: <A, B, E2>(f: (a: A) => B, onNullable: E2) => <E1>(self: Result<E1, A>) => Result<E2 | E1, NonNullable<B>>;
```

### flatMapOption

```ts
/**
 * @category sequencing
 * @since 3.0.0
 */
export declare const flatMapOption: <A, B, E2>(f: (a: A) => Option<B>, onNone: E2) => <E1>(self: Result<E1, A>) => Result<E2 | E1, B>;
```

### flatten

The `flatten` function is the conventional monad join operator. It is used to remove one level of monadic structure, projecting its bound argument into the outer level.

```ts
/**
 * @category sequencing
 * @since 3.0.0
 */
export declare const flatten: <E1, E2, A>(mma: Result<E1, Result<E2, A>>) => Result<E1 | E2, A>;
```

### foldMap

```ts
/**
 * @category folding
 * @since 3.0.0
 */
export declare const foldMap: <M>(Monoid: Monoid<M>) => <A>(f: (a: A) => M) => <E>(self: Result<E, A>) => M;
```

### fromNullable

Takes a lazy default and a nullable value, if the value is not nully, turn it into a `Success`, if the value is nully use
the provided default as a `Failure`.

```ts
/**
 * @category conversions
 * @since 3.0.0
 */
export declare const fromNullable: <E>(onNullable: E) => <A>(a: A) => Result<E, NonNullable<A>>;
```

### fromOption

```ts
/**
 * @category conversions
 * @since 3.0.0
 */
export declare const fromOption: <E>(onNone: E) => <A>(fa: Option<A>) => Result<E, A>;
```

### fromThrowable

Constructs a new `Result` from a function that might throw.

```ts
/**
 * @category interop
 * @since 3.0.0
 */
export declare const fromThrowable: <A, E>(f: () => A, onThrow: (error: unknown) => E) => Result<E, A>;
```

### getCompactable

```ts
/**
 * @category instances
 * @since 3.0.0
 */
export declare const getCompactable: <E>(onNone: E) => Compactable<ValidatedT<ResultTypeLambda, E>>;
```

### getEq

```ts
/**
 * @category instances
 * @since 3.0.0
 */
export declare const getEq: <E, A>(EE: Eq<E>, EA: Eq<A>) => Eq<Result<E, A>>;
```

### getFailure

Converts a `Result` to an `Option` discarding the success.

```ts
/**
 * @category conversions
 * @since 3.0.0
 */
export declare const getFailure: <E, A>(self: Result<E, A>) => Option<E>;
```

### getFilterable

```ts
/**
 * @category instances
 * @since 3.0.0
 */
export declare const getFilterable: <E>(onEmpty: E) => Filterable<ValidatedT<ResultTypeLambda, E>>;
```

### getOrElse

Returns the wrapped value if it's a `Success` or a default value if is a `Failure`.

```ts
/**
 * @category error handling
 * @since 3.0.0
 */
export declare const getOrElse: <B>(onError: B) => <A>(self: Result<unknown, A>) => B | A;
```

### getSemigroup

Semigroup returning the left-most non-`Failure` value. If both operands are `Success`es then the inner values are
combined using the provided `Semigroup`.

```ts
/**
 * @category instances
 * @since 3.0.0
 */
export declare const getSemigroup: <A, E>(S: Semigroup<A>) => Semigroup<Result<E, A>>;
```

### getShow

```ts
/**
 * @category instances
 * @since 3.0.0
 */
export declare const getShow: <E, A>(SE: Show<E>, SA: Show<A>) => Show<Result<E, A>>;
```

### getSuccess

Converts a `Result` to an `Option` discarding the error.

```ts
/**
 * @category conversions
 * @since 3.0.0
 */
export declare const getSuccess: <E, A>(self: Result<E, A>) => Option<A>;
```

### getTraversableFilterable

```ts
/**
 * @category instances
 * @since 3.0.0
 */
export declare const getTraversableFilterable: <E>(onEmpty: E) => TraversableFilterable<ValidatedT<ResultTypeLambda, E>>;
```

### getValidatedAlt

The default [`Alt`](#semigroupkind) instance returns the last error, if you want to
get all errors you need to provide a way to combine them via a `Semigroup`.

```ts
/**
 * @category error handling
 * @since 3.0.0
 */
export declare const getValidatedAlt: <E>(Semigroup: Semigroup<E>) => Alt<ValidatedT<ResultTypeLambda, E>>;
```

### getValidatedApplicative

The default [`Applicative`](#applicative) instance returns the first error, if you want to
get all errors you need to provide a way to combine them via a `Semigroup`.

```ts
/**
 * @category error handling
 * @since 3.0.0
 */
export declare const getValidatedApplicative: <E>(Semigroup: Semigroup<E>) => Applicative<ValidatedT<ResultTypeLambda, E>>;
```

### idKleisli

```ts
/**
 * @since 3.0.0
 */
export declare const idKleisli: <A>() => (a: A) => Result<never, A>;
```

### isFailure

Returns `true` if the either is an instance of `Failure`, `false` otherwise.

```ts
/**
 * @category refinements
 * @since 3.0.0
 */
export declare const isFailure: <E, A>(self: Result<E, A>) => self is Failure<E>;
```

### isSuccess

Returns `true` if the either is an instance of `Success`, `false` otherwise.

```ts
/**
 * @category refinements
 * @since 3.0.0
 */
export declare const isSuccess: <E, A>(self: Result<E, A>) => self is Success<A>;
```

### let

```ts
/**
 * @category do notation
 * @since 3.0.0
 */
export declare const let: <N extends string, A extends object, B>(name: Exclude<N, keyof A>, f: (a: A) => B) => <E>(self: Result<E, A>) => Result<E, { readonly [K in N | keyof A]: K extends keyof A ? A[K] : B; }>;
```

### lift2

Lifts a binary function into `Result`.

```ts
/**
 * @category lifting
 * @since 3.0.0
 */
export declare const lift2: <A, B, C>(f: (a: A, b: B) => C) => <E1, E2>(fa: Result<E1, A>, fb: Result<E2, B>) => Result<E1 | E2, C>;
```

### lift3

Lifts a ternary function into `Result`.

```ts
/**
 * @category lifting
 * @since 3.0.0
 */
export declare const lift3: <A, B, C, D>(f: (a: A, b: B, c: C) => D) => <E1, E2, E3>(fa: Result<E1, A>, fb: Result<E2, B>, fc: Result<E3, C>) => Result<E1 | E2 | E3, D>;
```

### liftNullable

```ts
/**
 * @category lifting
 * @since 3.0.0
 */
export declare const liftNullable: <A extends readonly unknown[], B, E>(f: (...a: A) => B, onNullable: E) => (...a: A) => Result<E, NonNullable<B>>;
```

### liftOption

```ts
/**
 * @category lifting
 * @since 3.0.0
 */
export declare const liftOption: <A extends readonly unknown[], B, E>(f: (...a: A) => Option<B>, onNone: E) => (...a: A) => Result<E, B>;
```

### liftPredicate

```ts
/**
 * @category lifting
 * @since 3.0.0
 */
export declare const liftPredicate: { <C extends A, B extends A, E, A = C>(refinement: Refinement<A, B>, onFalse: E): (c: C) => Result<E, B>; <B extends A, E, A = B>(predicate: Predicate<A>, onFalse: E): (b: B) => Result<E, B>; };
```

### liftThrowable

Lifts a function that may throw to one returning a `Result`.

```ts
/**
 * @category interop
 * @since 3.0.0
 */
export declare const liftThrowable: <A extends readonly unknown[], B, E>(f: (...a: A) => B, onThrow: (error: unknown) => E) => (...a: A) => Result<E, B>;
```

### map

Returns an effect whose success is mapped by the specified `f` function.

```ts
/**
 * @category mapping
 * @since 3.0.0
 */
export declare const map: <A, B>(f: (a: A) => B) => <E>(fa: Result<E, A>) => Result<E, B>;
```

### mapBoth

Returns an effect whose failure and success channels have been mapped by
the specified pair of functions, `f` and `g`.

```ts
/**
 * @category mapping
 * @since 3.0.0
 */
export declare const mapBoth: <E, G, A, B>(f: (e: E) => G, g: (a: A) => B) => (self: Result<E, A>) => Result<G, B>;
```

### mapError

Returns an effect with its error channel mapped using the specified
function. This can be used to lift a "smaller" error into a "larger" error.

```ts
/**
 * @category error handling
 * @since 3.0.0
 */
export declare const mapError: <E, G>(f: (e: E) => G) => <A>(self: Result<E, A>) => Result<G, A>;
```

### match

Takes two functions and an `Result` value, if the value is a `Failure` the inner value is applied to the first function,
if the value is a `Success` the inner value is applied to the second function.

```ts
/**
 * @category pattern matching
 * @since 3.0.0
 */
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
/**
 * @category error handling
 * @since 3.0.0
 */
export declare const orElse: <E2, B>(that: Result<E2, B>) => <E1, A>(self: Result<E1, A>) => Result<E2, B | A>;
```

### partition

```ts
/**
 * @category filtering
 * @since 3.0.0
 */
export declare const partition: { <C extends A, B extends A, E, A = C>(refinement: Refinement<A, B>, onFalse: E): (self: Result<E, C>) => readonly [Result<E, C>, Result<E, B>]; <B extends A, E, A = B>(predicate: Predicate<A>, onFalse: E): (self: Result<E, B>) => readonly [Result<E, B>, Result<E, B>]; };
```

### partitionMap

```ts
/**
 * @category filtering
 * @since 3.0.0
 */
export declare const partitionMap: <A, B, C, E>(f: (a: A) => Result<B, C>, onEmpty: E) => (self: Result<E, A>) => readonly [Result<E, B>, Result<E, C>];
```

### reduce

```ts
/**
 * @category folding
 * @since 3.0.0
 */
export declare const reduce: <B, A>(b: B, f: (b: B, a: A) => B) => <E>(self: Result<E, A>) => B;
```

### reduceRight

```ts
/**
 * @category folding
 * @since 3.0.0
 */
export declare const reduceRight: <B, A>(b: B, f: (a: A, b: B) => B) => <E>(self: Result<E, A>) => B;
```

### reverse

```ts
/**
 * @since 3.0.0
 */
export declare const reverse: <E, A>(ma: Result<E, A>) => Result<A, E>;
```

### separate

```ts
/**
 * @category filtering
 * @since 3.0.0
 */
export declare const separate: <E>(onEmpty: E) => <A, B>(self: Result<E, Result<A, B>>) => readonly [Result<E, A>, Result<E, B>];
```

### sequence

```ts
/**
 * @category traversing
 * @since 3.0.0
 */
export declare const sequence: <F extends TypeLambda>(F: Applicative<F>) => <E, FS, FR, FO, FE, A>(fa: Result<E, Kind<F, FS, FR, FO, FE, A>>) => Kind<F, FS, FR, FO, FE, Result<E, A>>;
```

### sequenceReadonlyArray

Equivalent to `ReadonlyArray#sequence(Applicative)`.

```ts
/**
 * @category traversing
 * @since 3.0.0
 */
export declare const sequenceReadonlyArray: <E, A>(arr: readonly Result<E, A>[]) => Result<E, readonly A[]>;
```

### succeed

Constructs a new `Result` holding a `Success` value. This usually represents a successful value due to the right bias
of this structure.

```ts
/**
 * @category constructors
 * @since 3.0.0
 */
export declare const succeed: <A>(a: A) => Result<never, A>;
```

### tap

Returns an effect that effectfully "peeks" at the success of this effect.

```ts
/**
 * @since 3.0.0
 */
export declare const tap: <A, E2>(f: (a: A) => Result<E2, unknown>) => <E1>(self: Result<E1, A>) => Result<E2 | E1, A>;
```

### tapError

Returns an effect that effectfully "peeks" at the failure of this effect.

```ts
/**
 * @category error handling
 * @since 3.0.0
 */
export declare const tapError: <E1, E2>(onError: (e: E1) => Result<E2, unknown>) => <A>(self: Result<E1, A>) => Result<E1 | E2, A>;
```

### toNull

```ts
/**
 * @category conversions
 * @since 3.0.0
 */
export declare const toNull: <E, A>(self: Result<E, A>) => A;
```

### toReadonlyArray

```ts
/**
 * @category conversions
 * @since 3.0.0
 */
export declare const toReadonlyArray: <E, A>(self: Result<E, A>) => readonly A[];
```

### toUndefined

```ts
/**
 * @category conversions
 * @since 3.0.0
 */
export declare const toUndefined: <E, A>(self: Result<E, A>) => A;
```

### toUnion

```ts
/**
 * @category conversions
 * @since 3.0.0
 */
export declare const toUnion: <E, A>(fa: Result<E, A>) => E | A;
```

### traverse

Map each element of a structure to an action, evaluate these actions from left to right, and collect the results.

```ts
/**
 * @category traversing
 * @since 3.0.0
 */
export declare const traverse: <F extends TypeLambda>(F: Applicative<F>) => <A, FS, FR, FO, FE, B>(f: (a: A) => Kind<F, FS, FR, FO, FE, B>) => <E>(ta: Result<E, A>) => Kind<F, FS, FR, FO, FE, Result<E, B>>;
```

### traverseFilterMap

```ts
/**
 * @category filtering
 * @since 3.0.0
 */
export declare const traverseFilterMap: <F extends TypeLambda>(Applicative: Applicative<F>) => <A, S, R, O, FE, B, E>(f: (a: A) => Kind<F, S, R, O, FE, Option<B>>, onNone: E) => (self: Result<E, A>) => Kind<F, S, R, O, FE, Result<E, B>>;
```

### traverseNonEmptyReadonlyArray

Equivalent to `NonEmptyReadonlyArray#traverse(Apply)`.

```ts
/**
 * @category traversing
 * @since 3.0.0
 */
export declare const traverseNonEmptyReadonlyArray: <A, E, B>(f: (a: A) => Result<E, B>) => (as: readonly [A, ...A[]]) => Result<E, readonly [B, ...B[]]>;
```

### traverseNonEmptyReadonlyArrayWithIndex

Equivalent to `NonEmptyReadonlyArray#traverseWithIndex(Apply)`.

```ts
/**
 * @category traversing
 * @since 3.0.0
 */
export declare const traverseNonEmptyReadonlyArrayWithIndex: <A, E, B>(f: (index: number, a: A) => Result<E, B>) => (as: readonly [A, ...A[]]) => Result<E, readonly [B, ...B[]]>;
```

### traversePartitionMap

```ts
/**
 * @category filtering
 * @since 3.0.0
 */
export declare const traversePartitionMap: <F extends TypeLambda>(Applicative: Applicative<F>) => <A, S, R, O, FE, B, C, E>(f: (a: A) => Kind<F, S, R, O, FE, Result<B, C>>, onNone: E) => (self: Result<E, A>) => Kind<F, S, R, O, FE, readonly [Result<E, B>, Result<E, C>]>;
```

### traverseReadonlyArray

Equivalent to `ReadonlyArray#traverse(Applicative)`.

```ts
/**
 * @category traversing
 * @since 3.0.0
 */
export declare const traverseReadonlyArray: <A, E, B>(f: (a: A) => Result<E, B>) => (as: readonly A[]) => Result<E, readonly B[]>;
```

### traverseReadonlyArrayWithIndex

Equivalent to `ReadonlyArray#traverseWithIndex(Applicative)`.

```ts
/**
 * @category traversing
 * @since 3.0.0
 */
export declare const traverseReadonlyArrayWithIndex: <A, E, B>(f: (index: number, a: A) => Result<E, B>) => (as: readonly A[]) => Result<E, readonly B[]>;
```

### tupled

```ts
/**
 * @category tuple sequencing
 * @since 3.0.0
 */
export declare const tupled: <E, A>(self: Result<E, A>) => Result<E, readonly [A]>;
```

### unit

Returns the effect resulting from mapping the success of this effect to unit.

```ts
/**
 * @category mapping
 * @since 3.0.0
 */
export declare const unit: <E>(self: Result<E, unknown>) => Result<E, void>;
```

### zipFlatten

Sequentially zips this effect with the specified effect.

```ts
/**
 * @category tuple sequencing
 * @since 3.0.0
 */
export declare const zipFlatten: <E2, B>(fb: Result<E2, B>) => <E1, A extends readonly unknown[]>(self: Result<E1, A>) => Result<E2 | E1, readonly [...A, B]>;
```

### zipLeft

Sequences the specified effect after this effect, but ignores the value
produced by the effect.

```ts
/**
 * @category sequencing
 * @since 3.0.0
 */
export declare const zipLeft: <E2>(that: Result<E2, unknown>) => <E1, A>(self: Result<E1, A>) => Result<E2 | E1, A>;
```

### zipRight

A variant of `flatMap` that ignores the value produced by this effect.

```ts
/**
 * @category sequencing
 * @since 3.0.0
 */
export declare const zipRight: <E2, A>(that: Result<E2, A>) => <E1>(self: Result<E1, unknown>) => Result<E2 | E1, A>;
```

### zipWith

Sequentially zips this effect with the specified effect using the specified combiner function.

```ts
/**
 * @category tuple sequencing
 * @since 3.0.0
 */
export declare const zipWith: <E2, B, A, C>(that: Result<E2, B>, f: (a: A, b: B) => C) => <E1>(self: Result<E1, A>) => Result<E2 | E1, C>;
```

