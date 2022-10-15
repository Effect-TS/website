## STM

Reference Documentation for the module '@effect/stm/STM'

`STM<R, E, A>` represents an effect that can be performed transactionally,
 resulting in a failure `E` or a value `A` that may require an environment
 `R` to execute.

Software Transactional Memory is a technique which allows composition of
arbitrary atomic operations.  It is the software analog of transactions in
database systems.

The API is lifted directly from the Haskell package Control.Concurrent.STM
although the implementation does not resemble the Haskell one at all.

See http://hackage.haskell.org/package/stm-2.5.0.0/docs/Control-Concurrent-STM.html

STM in Haskell was introduced in:

Composable memory transactions, by Tim Harris, Simon Marlow, Simon Peyton
Jones, and Maurice Herlihy, in ACM Conference on Principles and Practice of
Parallel Programming 2005.

See https://www.microsoft.com/en-us/research/publication/composable-memory-transactions/

See also:
 Lock Free Data Structures using STMs in Haskell, by Anthony Discolo, Tim
 Harris, Simon Marlow, Simon Peyton Jones, Satnam Singh) FLOPS 2006: Eighth
 International Symposium on Functional and Logic Programming, Fuji Susono,
 JAPAN, April 2006

 https://www.microsoft.com/en-us/research/publication/lock-free-data-structures-using-stms-in-haskell/

The implemtation is based on the ZIO STM module, while JS environments have
no race conditions from multiple threads STM provides greater benefits for
synchronization of Fibers and transactional data-types can be quite useful.

```ts
export interface STM<R, E, A> {
    readonly [STMSym]: STMSym;
    readonly [_R]: () => R;
    readonly [_E]: () => E;
    readonly [_A]: () => A;
}
```

## General API

### absolve

Submerges the error case of an `Either` into the `STM`. The inverse
operation of `STM.either`.

```ts
export declare const absolve: <R, E, E1, A>(self: STM<R, E, Either<E1, A>>) => STM<R, E | E1, A>;
```

### as

Maps the success value of this effect to the specified constant value.

```ts
export declare const as: <B>(b: B) => <R, E, A>(self: STM<R, E, A>) => STM<R, E, B>;
```

### asSome

Maps the success value of this effect to an optional value.

```ts
export declare const asSome: <R, E, A>(self: STM<R, E, A>) => STM<R, E, Maybe<A>>;
```

### asSomeError

Maps the error value of this effect to an optional value.

```ts
export declare const asSomeError: <R, E, A>(self: STM<R, E, A>) => STM<R, Maybe<E>, A>;
```

### atomically

```ts
export declare const atomically: <R, E, A>(self: STM<R, E, A>) => Effect<R, E, A>;
```

### bind

Binds an effectful value in a `do` scope

```ts
export declare const bind: <R, E, A, K, N extends string>(tag: Exclude<N, keyof K>, f: (_: K) => STM<R, E, A>) => <R2, E2>(self: STM<R2, E2, K>) => STM<R | R2, E | E2, MergeRecord<K, { [k in N]: A; }>>;
```

### bindValue

Like bind for values

```ts
export declare const bindValue: <A, K, N extends string>(tag: Exclude<N, keyof K>, f: (_: K) => A) => <R2, E2>(self: STM<R2, E2, K>) => STM<R2, E2, MergeRecord<K, { [k in N]: A; }>>;
```

### catch

```ts
export declare const catch: <N extends keyof E, K extends E[N] & string, E, R1, E1, A1>(tag: N, k: K, f: (e: Extract<E, { [n in N]: K; }>) => STM<R1, E1, A1>) => <R, A>(self: STM<R, E, A>) => STM<R1 | R, E1 | Exclude<E, { [n in N]: K; }>, A1 | A>;
```

### catchAll

Recovers from all errors.

```ts
export declare const catchAll: <E, R1, E1, B>(f: (e: E) => STM<R1, E1, B>) => <R, A>(self: STM<R, E, A>) => STM<R1 | R, E1, B | A>;
```

### catchSome

Recovers from some or all of the error cases.

```ts
export declare const catchSome: <E, R1, E1, B>(f: (e: E) => Maybe<STM<R1, E1, B>>) => <R, A>(self: STM<R, E, A>) => STM<R1 | R, E | E1, B | A>;
```

### catchTag

Recovers from specified error.

```ts
export declare const catchTag: <K extends E["_tag"] & string, E extends { _tag: string; }, R1, E1, A1>(k: K, f: (e: Extract<E, { _tag: K; }>) => STM<R1, E1, A1>, __trace?: string) => <R, A>(self: STM<R, E, A>) => STM<R1 | R, E1 | Exclude<E, { _tag: K; }>, A1 | A>;
```

### check

Checks the condition, and if it's true, returns unit, otherwise, retries.

```ts
export declare const check: (predicate: LazyArg<boolean>) => STM<never, never, void>;
```

### collect

Evaluate each effect in the structure from left to right, collecting the
the successful values and discarding the empty cases.

```ts
export declare const collect: <R, E, A, B>(as: Collection<A>, f: (a: A) => STM<R, Maybe<E>, B>) => STM<R, E, Chunk<B>>;
```

### collectAll

Collects all the transactional effects in a collection, returning a single
transactional effect that produces a collection of values.

```ts
export declare const collectAll: <R, E, A>(as: Collection<STM<R, E, A>>) => STM<R, E, Chunk<A>>;
```

### collectAllDiscard

Collects all the transactional effects, returning a single transactional
effect that produces `Unit`.

Equivalent to `collectAll(i).unit`, but without the cost of building the
list of results.

```ts
export declare const collectAllDiscard: <R, E, A>(as: Collection<STM<R, E, A>>) => STM<R, E, void>;
```

### collectFirst

Collects the first element of the `Collection<A?` for which the effectual
function `f` returns `Some`.

```ts
export declare const collectFirst: <R, E, A, B>(as: Collection<A>, f: (a: A) => STM<R, E, Maybe<B>>) => STM<R, E, Maybe<B>>;
```

### collectNow

Simultaneously filters and maps the value produced by this effect.

```ts
export declare const collectNow: <A, B>(pf: (a: A) => Maybe<B>) => <R, E>(self: STM<R, E, A>) => STM<R, E, B>;
```

### collectSTM

Simultaneously filters and flatMaps the value produced by this effect.
Continues on the effect returned from pf.

```ts
export declare const collectSTM: <A, R1, E1, B>(pf: (a: A) => STM<R1, E1, Maybe<B>>) => <R, E>(self: STM<R, E, A>) => STM<R1 | R, E1 | E, B>;
```

### commit

Commits this transaction atomically.

```ts
export declare const commit: <R, E, A>(self: STM<R, E, A>) => Effect<R, E, A>;
```

### commitEither

Commits this transaction atomically, regardless of whether the transaction
is a success or a failure.

```ts
export declare const commitEither: <R, E, A>(self: STM<R, E, A>) => Effect<R, E, A>;
```

### concreteSTM

```ts
export declare const concreteSTM: <R, E, A>(_: STM<R, E, A>) => asserts _ is STMEffect<R, E, A> | STMOnFailure<R, unknown, E, A> | STMOnSuccess<R, E, unknown, A> | STMOnRetry<R, E, A, unknown, unknown, unknown> | STMSucceed<R, E, A> | STMSucceedNow<R, E, A> | STMProvide<unknown, R, E, A>;
```

### cond

Evaluate the predicate, return the given `A` as success if predicate returns
true, and the given `E` as error otherwise

For effectful conditionals, see `ifSTM`.

```ts
export declare const cond: <E, A>(predicate: LazyArg<boolean>, result: LazyArg<A>, error: LazyArg<E>) => STM<never, E, A>;
```

### continueOrFail

Fail with `e` if the supplied partial function does not match, otherwise
succeed with the returned value.

```ts
export declare const continueOrFail: <E1, A, A2>(e: E1, pf: (a: A) => Maybe<A2>) => <R, E>(self: STM<R, E, A>) => STM<R, E1 | E, A2>;
```

### continueOrFailSTM

Fail with `e` if the supplied partial function does not match, otherwise
continue with the returned value.

```ts
export declare const continueOrFailSTM: <E1, A, R2, E2, A2>(e: E1, pf: (a: A) => Maybe<STM<R2, E2, A2>>) => <R, E>(self: STM<R, E, A>) => STM<R2 | R, E1 | E2 | E, A2>;
```

### continueOrRetry

Retry the transaction if the supplied partial function does not match,
otherwise succeed with the returned value.

```ts
export declare const continueOrRetry: <R, E, A, A2>(pf: (a: A) => Maybe<A2>) => <R_1, E_1>(self: STM<R_1, E_1, A>) => STM<R_1, E_1, A2>;
```

### continueOrRetrySTM

Simultaneously filters and flatMaps the value produced by this effect.
Continues on the effect returned from the specified partial function.

```ts
export declare const continueOrRetrySTM: <A, R2, E2, A2>(pf: (a: A) => Maybe<STM<R2, E2, A2>>) => <R, E>(self: STM<R, E, A>) => STM<R2 | R, E2 | E, A2>;
```

### die

Kills the fiber running the effect.

```ts
export declare const die: (u: unknown) => STM<never, never, never>;
```

### dieMessage

Kills the fiber running the effect with a `RuntimeError` that contains
the specified message.

```ts
export declare const dieMessage: (message: string) => STM<never, never, never>;
```

### dieSync

Kills the fiber running the effect.

```ts
export declare const dieSync: (u: LazyArg<unknown>) => STM<never, never, never>;
```

### done

Returns a value modelled on provided exit status.

```ts
export declare const done: <E, A>(exit: TExit<E, A>) => STM<never, E, A>;
```

### effect

```ts
export declare const effect: <R, A>(f: (journal: Journal, fiberId: FiberId, environment: Env<R>) => A) => STM<R, never, A>;
```

### either

Converts the failure channel into an `Either`.

```ts
export declare const either: <R, E, A>(self: STM<R, E, A>) => STM<R, never, Either<E, A>>;
```

### ensuring

Executes the specified finalization transaction whether or
not this effect succeeds. Note that as with all STM transactions,
if the full transaction fails, everything will be rolled back.

```ts
export declare const ensuring: <R1, B>(finalizer: STM<R1, never, B>) => <R, E, A>(self: STM<R, E, A>) => STM<R1 | R, E, A>;
```

### environment

Retrieves the environment inside an `STM`.

```ts
export declare const environment: <R>() => STM<R, never, Env<R>>;
```

### environmentWith

Accesses the environment of the transaction.

```ts
export declare const environmentWith: <R, A>(f: (env: Env<R>) => A) => STM<R, never, A>;
```

### environmentWithSTM

Accesses the environment of the transaction to perform a transaction.

```ts
export declare const environmentWithSTM: <R0, R, E, A>(f: (env: Env<R0>) => STM<R, E, A>) => STM<R0 | R, E, A>;
```

### eventually

Returns an effect that ignores errors and runs repeatedly until it eventually succeeds.

```ts
export declare const eventually: <R, E, A>(self: STM<R, E, A>) => STM<R, never, A>;
```

### exists

Determines whether any element of the `Collection<A>` satisfies the effectual
predicate `f`.

```ts
export declare const exists: <R, E, A>(as: Collection<A>, f: (a: A) => STM<R, E, boolean>) => STM<R, E, boolean>;
```

### fail

Returns a value that models failure in the transaction.

```ts
export declare const fail: <E>(e: E) => STM<never, E, never>;
```

### failSync

Returns a value that models failure in the transaction.

```ts
export declare const failSync: <E>(e: LazyArg<E>) => STM<never, E, never>;
```

### fiberId

Returns the fiber id of the fiber committing the transaction.

```ts
export declare const fiberId: USTM<FiberId>;
```

### filter

Filters the collection using the specified effectual predicate.

```ts
export declare const filter: <A, R, E>(as: Collection<A>, f: (a: A) => STM<R, E, boolean>) => STM<R, E, Chunk<A>>;
```

### filterNot

Filters the collection using the specified effectual predicate, removing
all elements that satisfy the predicate.

```ts
export declare const filterNot: <A, R, E>(as: Collection<A>, f: (a: A) => STM<R, E, boolean>) => STM<R, E, Chunk<A>>;
```

### filterOrDie

Dies with specified `unknown` if the predicate fails.

```ts
export declare const filterOrDie: { <A, B extends A>(f: Refinement<A, B>, defect: LazyArg<unknown>): <R, E>(self: STM<R, E, A>) => STM<R, E, B>; <A>(f: Predicate<A>, defect: LazyArg<unknown>): <R, E>(self: STM<R, E, A>) => STM<R, E, A>; };
```

### filterOrDieMessage

Dies with specified `unknown` if the predicate fails.

```ts
export declare const filterOrDieMessage: { <A, B extends A>(f: Refinement<A, B>, message: string): <R, E>(self: STM<R, E, A>) => STM<R, E, B>; <A>(f: Predicate<A>, message: string): <R, E>(self: STM<R, E, A>) => STM<R, E, A>; };
```

### filterOrDieWith

Dies with specified `unknown` if the predicate fails.

```ts
export declare const filterOrDieWith: { <A, B extends A>(f: Refinement<A, B>, dieWith: (a: Exclude<A, B>) => unknown): <R, E>(self: STM<R, E, A>) => STM<R, E, B>; <A>(f: Predicate<A>, dieWith: (a: A) => unknown): <R, E>(self: STM<R, E, A>) => STM<R, E, A>; };
```

### filterOrElse

Supplies `orElse` if the predicate fails.

```ts
export declare const filterOrElse: { <A, B extends A, R2, E2, A2>(f: Refinement<A, B>, orElse: LazyArg<STM<R2, E2, A2>>): <R, E>(self: STM<R, E, A>) => STM<R2 | R, E2 | E, B | A2>; <A, R2, E2, A2>(f: Predicate<A>, orElse: LazyArg<STM<R2, E2, A2>>): <R, E>(self: STM<R, E, A>) => STM<R2 | R, E2 | E, A | A2>; };
```

### filterOrElseWith

Applies `orElse` if the predicate fails.

```ts
export declare const filterOrElseWith: { <A, B extends A, R2, E2, A2>(f: Refinement<A, B>, orElse: (a: A) => STM<R2, E2, A2>): <R, E>(self: STM<R, E, A>) => STM<R2 | R, E2 | E, B | A2>; <A, R2, E2, A2>(f: Predicate<A>, orElse: (a: A) => STM<R2, E2, A2>): <R, E>(self: STM<R, E, A>) => STM<R2 | R, E2 | E, A | A2>; };
```

### filterOrFail

Fails with the specified error if the predicate fails.

```ts
export declare const filterOrFail: { <A, B extends A, E1>(f: Refinement<A, B>, e: LazyArg<E1>): <R, E>(self: STM<R, E, A>) => STM<R, E1 | E, B>; <A, E1>(f: Predicate<A>, e: LazyArg<E1>): <R, E>(self: STM<R, E, A>) => STM<R, E1 | E, A>; };
```

### filterOrFailWith

Fails with `failWith` if the predicate fails.

```ts
export declare const filterOrFailWith: { <A, B extends A, E1>(f: Refinement<A, B>, failWith: (a: Exclude<A, B>) => E1): <R, E>(self: STM<R, E, A>) => STM<R, E1 | E, B>; <A, E1>(f: Predicate<A>, failWith: (a: A) => E1): <R, E>(self: STM<R, E, A>) => STM<R, E1 | E, A>; };
```

### flatMap

Feeds the value produced by this effect to the specified function,
and then runs the returned effect as well to produce its results.

```ts
export declare const flatMap: <A, R1, E1, A2>(f: (a: A) => STM<R1, E1, A2>) => <R, E>(self: STM<R, E, A>) => STM<R1 | R, E1 | E, A2>;
```

### flatMapError

Creates a composite effect that represents this effect followed by another
one that may depend on the error produced by this one.

```ts
export declare const flatMapError: <E, R2, E2>(f: (e: E) => STM<R2, never, E2>) => <R, A>(self: STM<R, E, A>) => STM<R2 | R, E2, A>;
```

### flatten

Flattens out a nested `STM` effect.

```ts
export declare const flatten: <R, E, R1, E1, B>(self: STM<R, E, STM<R1, E1, B>>) => STM<R | R1, E | E1, B>;
```

### flattenErrorMaybe

Unwraps the optional error, defaulting to the provided value.

```ts
export declare const flattenErrorMaybe: <E2>(def: E2) => <R, E, A>(self: STM<R, Maybe<E>, A>) => STM<R, E2 | E, A>;
```

### flip

Returns an effect that swaps the error/success cases. This allows you to
use all methods on the error channel, possibly before flipping back.

```ts
export declare const flip: <R, E, A>(self: STM<R, E, A>) => STM<R, A, E>;
```

### flipWith

Swaps the error/value parameters, applies the function `f` and flips the parameters back

```ts
export declare const flipWith: <R, E, A, R2, E2, A2>(f: (stm: STM<R, A, E>) => STM<R2, A2, E2>) => (self: STM<R, E, A>) => STM<R2, E2, A2>;
```

### fold

Folds over the `STM` effect, handling both P.failure and success, but not
retry.

```ts
export declare const fold: <E, C, A, B>(g: (e: E) => C, f: (a: A) => B) => <R>(self: STM<R, E, A>) => STM<R, never, C | B>;
```

### foldSTM

Effectfully folds over the `STM` effect, handling both failure and
success.

```ts
export declare const foldSTM: <E, R1, E1, A1, A, R2, E2, A2>(g: (e: E) => STM<R1, E1, A1>, f: (a: A) => STM<R2, E2, A2>) => <R>(self: STM<R, E, A>) => STM<R1 | R2 | R, E1 | E2, A1 | A2>;
```

### forAll

Determines whether all elements of the `Collection<A>` satisfies the effectual
predicate `f`.

```ts
export declare const forAll: <R, E, A>(as: Collection<A>, f: (a: A) => STM<R, E, boolean>) => STM<R, E, boolean>;
```

### forEach

Applies the function `f` to each element of the `Collection<A>` and
returns a transactional effect that produces a new `Chunk<B>`.

```ts
export declare const forEach: <A, R, E, B>(as: Collection<A>, f: (a: A) => STM<R, E, B>) => STM<R, E, Chunk<B>>;
```

### forEachDiscard

Applies the function `f` to each element of the `Collection<A>` and runs
produced effects sequentially.

Equivalent to `unit(forEach(as, f))`, but without the cost of building
the list of results.

```ts
export declare const forEachDiscard: <R, E, A, X>(as: Collection<A>, f: (a: A) => STM<R, E, X>) => STM<R, E, void>;
```

### fromEither

Lifts an `Either` into a `STM`.

```ts
export declare const fromEither: <E, A>(e: Either<E, A>) => STM<never, E, A>;
```

### fromMaybe

Lifts an `Maybe` into a `STM`.

```ts
export declare const fromMaybe: <A>(option: Maybe<A>) => STM<never, Maybe<never>, A>;
```

### gen

Do simulation using Generators

```ts
export declare const gen: <Eff extends GenSTM<any, any, any>, AEff>(f: (i: <R, E, A>(_: STM<R, E, A>) => GenSTM<R, E, A>) => Generator<Eff, AEff, any>) => STM<[Eff] extends [{ [_R]: () => infer R; }] ? R : never, [Eff] extends [{ [_E]: () => infer E; }] ? E : never, AEff>;
```

### get

Unwraps the optional success of this effect, but can fail with an None value.

```ts
export declare const get: <R, E, A>(self: STM<R, E, Maybe<A>>) => STM<R, Maybe<E>, A>;
```

### head

Returns a successful effect with the head of the list if the list is
non-empty or fails with the error `None` if the list is empty.

```ts
export declare const head: <R, E, A>(self: STM<R, E, Collection<A>>) => STM<R, Maybe<E>, A>;
```

### ifSTM

Runs `onTrue` if the result of `self` is `true` and `onFalse` otherwise.

```ts
export declare const ifSTM: <R, R1, R2, E, E1, E2, A, A1>(b: LazyArg<STM<R, E, boolean>>, onTrue: LazyArg<STM<R1, E1, A>>, onFalse: LazyArg<STM<R2, E2, A1>>) => STM<R | R1 | R2, E | E1 | E2, A | A1>;
```

### ignore

Returns a new effect that ignores the success or failure of this effect.

```ts
export declare const ignore: <R, E, A>(self: STM<R, E, A>) => STM<R, never, void>;
```

### interrupt

Interrupts the fiber running the effect.

```ts
export declare const interrupt: USTM<never>;
```

### interruptAs

Interrupts the fiber running the effect with the specified fiber id.

```ts
export declare const interruptAs: (fiberId: FiberId) => USTM<never>;
```

### isDieException

```ts
export declare const isDieException: (u: unknown) => u is STMDieException<unknown>;
```

### isFailException

```ts
export declare const isFailException: (u: unknown) => u is STMFailException<unknown>;
```

### isFailure

Returns whether this effect is a failure.

```ts
export declare const isFailure: <R, E, A>(self: STM<R, E, A>) => STM<R, never, boolean>;
```

### isInterruptException

```ts
export declare const isInterruptException: (u: unknown) => u is STMInterruptException;
```

### isRetryException

```ts
export declare const isRetryException: (u: unknown) => u is STMRetryException;
```

### isSuccess

Returns whether this effect is a success.

```ts
export declare const isSuccess: <R, E, A>(self: STM<R, E, A>) => STM<R, never, boolean>;
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
export declare const iterate: <Z>(initial: Z, cont: (z: Z) => boolean) => <R, E>(body: (z: Z) => STM<R, E, Z>) => STM<R, E, Z>;
```

### left

"Zooms in" on the value in the `Left` side of an `Either`, moving the
possibility that the value is a `Right` to the error channel.

```ts
export declare const left: <R, E, A, B>(self: STM<R, E, Either<A, B>>) => STM<R, Either<E, B>, A>;
```

### leftOrFail

Returns a successful effect if the value is `Left`, or fails with the error e.

```ts
export declare const leftOrFail: <C, E1>(orFail: (c: C) => E1) => <R, E, B>(self: STM<R, E, Either<B, C>>) => STM<R, E1 | E, B>;
```

### leftOrFailException

Returns a successful effect if the value is `Left`, or fails with a
`NoSuchElementException`.

```ts
export declare const leftOrFailException: <R, E, B, C>(self: STM<R, E, Either<B, C>>) => STM<R, NoSuchElement | E, B>;
```

### loop

Loops with the specified transactional function, collecting the results
into a list. The moral equivalent of:

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
export declare const loop: <Z>(initial: Z, cont: (z: Z) => boolean, inc: (z: Z) => Z) => <R, E, A>(body: (z: Z) => STM<R, E, A>) => STM<R, E, Chunk<A>>;
```

### loopDiscard

Loops with the specified transactional function purely for its
transactional effects. The moral equivalent of:

```typescript
var s = initial

while (cont(s)) {
  body(s)
  s = inc(s)
}
```

```ts
export declare const loopDiscard: <Z>(initial: Z, cont: (z: Z) => boolean, inc: (z: Z) => Z) => <R, E, X>(body: (z: Z) => STM<R, E, X>) => STM<R, E, void>;
```

### map

Maps the value produced by the effect.

```ts
export declare const map: <A, B>(f: (a: A) => B) => <R, E>(self: STM<R, E, A>) => STM<R, E, B>;
```

### mapBoth

Returns an `STM` effect whose failure and success channels have been mapped by
the specified pair of functions, `f` and `g`.

```ts
export declare const mapBoth: <E, E1, A, A1>(g: (e: E) => E1, f: (a: A) => A1) => <R>(self: STM<R, E, A>) => STM<R, E1, A1>;
```

### mapError

Maps from one error type to another.

```ts
export declare const mapError: <E, E1>(f: (a: E) => E1) => <R, A>(self: STM<R, E, A>) => STM<R, E1, A>;
```

### mapTryCatch

Returns an effect whose success is mapped by the specified side effecting
`f` function, translating any thrown exceptions into typed failed effects.

```ts
export declare const mapTryCatch: <A, B, E1>(f: (a: A) => B, onThrow: (u: unknown) => E1) => <R, E>(self: STM<R, E, A>) => STM<R, E1 | E, B>;
```

### merge

Returns a new effect where the error channel has been merged into the
success channel to their common combined type.

```ts
export declare const merge: <R, E, A>(self: STM<R, E, A>) => STM<R, never, E | A>;
```

### mergeAll

Merges an `Collection<STM<R, E, A>>` to a single `STM<R, E, B>`, working
sequentially.

```ts
export declare const mergeAll: <R, E, A, B>(as: Collection<STM<R, E, A>>, zero: B, f: (b: B, a: A) => B) => STM<R, E, B>;
```

### negate

Returns a new effect where boolean value of this effect is negated.

```ts
export declare const negate: <R, E>(self: STM<R, E, boolean>) => STM<R, E, boolean>;
```

### noneOrFail

Requires the option produced by this value to be `None`.

```ts
export declare const noneOrFail: <R, E, A, B>(self: STM<R, E, Maybe<A>>) => STM<R, Maybe<E>, void>;
```

### option

Converts the failure channel into an `Maybe`.

```ts
export declare const option: <R, E, A>(self: STM<R, E, A>) => STM<R, never, Maybe<A>>;
```

### orDie

Translates `STM` effect failure into death of the fiber, making all
failures unchecked and not a part of the type of the effect.

```ts
export declare const orDie: <R, E, A>(self: STM<R, E, A>) => STM<R, never, A>;
```

### orDieWith

Keeps none of the errors, and terminates the fiber running the `STM` effect
with them, using the specified function to convert the `E` into a
`unknown` defect.

```ts
export declare const orDieWith: <E>(f: (e: E) => unknown) => <R, A>(self: STM<R, E, A>) => STM<R, never, A>;
```

### orElse

Tries this effect first, and if it fails or retries, tries the other
effect.

```ts
export declare const orElse: <R1, E1, A1>(that: LazyArg<STM<R1, E1, A1>>) => <R, E, A>(self: STM<R, E, A>) => STM<R1 | R, E1 | E, A1 | A>;
```

### orElseEither

Returns a transactional effect that will produce the value of this effect
in left side, unless it fails or retries, in which case, it will produce
the value of the specified effect in right side.

```ts
export declare const orElseEither: <R1, E1, B>(that: LazyArg<STM<R1, E1, B>>) => <R, E, A>(self: STM<R, E, A>) => STM<R1 | R, E1 | E, Either<A, B>>;
```

### orElseFail

Tries this effect first, and if it fails or retries, fails with the
specified error.

```ts
export declare const orElseFail: <E1>(e: LazyArg<E1>) => <R, E, A>(self: STM<R, E, A>) => STM<R, E1 | E, A>;
```

### orElseOptional

Returns an effect that will produce the value of this effect, unless it
fails with the `None` value, in which case it will produce the value of the
specified effect.

```ts
export declare const orElseOptional: <R1, E1, A1>(that: LazyArg<STM<R1, Maybe<E1>, A1>>) => <R, E, A>(self: STM<R, Maybe<E>, A>) => STM<R1 | R, Maybe<E1 | E>, A1 | A>;
```

### orElseSucceed

Tries this effect first, and if it fails or retries, succeeds with the
specified value.

```ts
export declare const orElseSucceed: <A1>(a: LazyArg<A1>) => <R, E, A>(self: STM<R, E, A>) => STM<R, E, A1 | A>;
```

### orTry

Tries this effect first, and if it enters retry, then it tries the other
effect. This is an equivalent of haskell's orElse.

```ts
export declare const orTry: <R1, E1, A1>(that: LazyArg<STM<R1, E1, A1>>) => <R, E, A>(self: STM<R, E, A>) => STM<R1 | R, E1 | E, A1 | A>;
```

### partition

Feeds elements of type `A` to a function `f` that returns an effect.
Collects all successes and failures in a tupled fashion.

```ts
export declare const partition: <R, E, A, B>(as: Collection<A>, f: (a: A) => STM<R, E, B>) => STM<R, never, readonly [Chunk<E>, Chunk<B>]>;
```

### provideEnvironment

Provides the transaction its required environment, which eliminates
its dependency on `R`.

```ts
export declare const provideEnvironment: <R>(env: Env<R>) => <E, A>(self: STM<R, E, A>) => STM<never, E, A>;
```

### provideService

Provides the effect with the single service it requires. If the effect
requires more than one service use `provideEnvironment` instead.

```ts
export declare const provideService: <T, T1 extends T>(tag: Tag<T>, service: T1) => <R, E, A>(self: STM<R, E, A>) => STM<Exclude<R, T>, E, A>;
```

### provideServiceSTM

```ts
export declare const provideServiceSTM: <T, R1, E1, T1 extends T>(tag: Tag<T>, service: STM<R1, E1, T1>) => <R, E, A>(self: STM<R, E, A>) => STM<R1 | Exclude<R, T>, E1 | E, A>;
```

### provideSomeEnvironment

Provides some of the environment required to run this effect,
leaving the remainder `R0`.

```ts
export declare const provideSomeEnvironment: <R0, R>(f: (env: Env<R0>) => Env<R>) => <E, A>(self: STM<R, E, A>) => STM<R0, E, A>;
```

### reduce

Folds an `Collection<A>` using an effectual function f, working sequentially
from left to right.

```ts
export declare const reduce: <A, Z, R, E>(as: Collection<A>, z: Z, f: (z: Z, a: A) => STM<R, E, Z>) => STM<R, E, Z>;
```

### reduceAll

Reduces an `Collection<STM<R, E, A>>` to a single `STM<R, E, A>`, working
sequentially.

```ts
export declare const reduceAll: <R, E, A>(a: STM<R, E, A>, as: Collection<STM<R, E, A>>, f: (acc: A, a: A) => A) => STM<R, E, A>;
```

### reduceRight_

Folds an `Collection<A>` using an effectual function f, working sequentially from left to right.

```ts
export declare const reduceRight_: <A, Z, R, E>(as: Collection<A>, z: Z, f: (a: A, z: Z) => STM<R, E, Z>) => STM<R, E, Z>;
```

### refineOrDie

Keeps some of the errors, and terminates the fiber with the rest

```ts
export declare const refineOrDie: <E, E1>(pf: (e: E) => Maybe<E1>) => <R, A>(self: STM<R, E, A>) => STM<R, E1, A>;
```

### refineOrDieWith

Keeps some of the errors, and terminates the fiber with the rest, using
the specified function to convert the `E` into a `Throwable`.

```ts
export declare const refineOrDieWith: <E, E1>(pf: (e: E) => Maybe<E1>, f: (e: E) => unknown) => <R, A>(self: STM<R, E, A>) => STM<R, E1, A>;
```

### reject

Fail with the returned value if the `PartialFunction` matches, otherwise
continue with our held value.

```ts
export declare const reject: <A, E1>(pf: (a: A) => Maybe<E1>) => <R, E>(self: STM<R, E, A>) => STM<R, E1 | E, A>;
```

### rejectSTM

Continue with the returned computation if the `PartialFunction` matches,
translating the successful match into a failure, otherwise continue with
our held value.

```ts
export declare const rejectSTM: <A, R1, E1>(pf: (a: A) => Maybe<STM<R1, E1, E1>>) => <R, E>(self: STM<R, E, A>) => STM<R1 | R, E1 | E, A>;
```

### repeatUntil

Repeats this `STM` effect until its result satisfies the specified
predicate. **WARNING**: `repeatUntil` uses a busy loop to repeat the
effect and will consume a thread until it completes (it cannot yield). This
is because STM describes a single atomic transaction which must either
complete, retry or fail a transaction before yielding back to the ZIO
Runtime.
  - Use `retryUntil` instead if you don't need to maintain transaction
    state for repeats.
  - Ensure repeating the STM effect will eventually satisfy the predicate.
  - Consider using the Blocking thread pool for execution of the
    transaction.

```ts
export declare const repeatUntil: <A>(f: Predicate<A>) => <R, E>(self: STM<R, E, A>) => STM<R, E, A>;
```

### repeatWhile

Repeats this `STM` effect while its result satisfies the specified
predicate. **WARNING**: `repeatWhile` uses a busy loop to repeat the
effect and will consume a thread until it completes (it cannot yield). This
is because STM describes a single atomic transaction which must either
complete, retry or fail a transaction before yielding back to the ZIO
Runtime.
  - Use `retryWhile` instead if you don't need to maintain transaction
    state for repeats.
  - Ensure repeating the STM effect will eventually not satisfy the
    predicate.
  - Consider using the Blocking thread pool for execution of the
    transaction.

```ts
export declare const repeatWhile: <A>(f: Predicate<A>) => <R, E>(self: STM<R, E, A>) => STM<R, E, A>;
```

### replicate

Replicates the given effect `n` times.

```ts
export declare const replicate: <R, E, A>(n: number, stm: STM<R, E, A>) => Chunk<STM<R, E, A>>;
```

### replicateNow

Replicates the given effect `n` times.

```ts
export declare const replicateNow: (n: number) => <R, E, A>(self: STM<R, E, A>) => Chunk<STM<R, E, A>>;
```

### replicateSTM

Performs this transaction the specified number of times and collects the
results.

```ts
export declare const replicateSTM: (n: number) => <R, E, A>(self: STM<R, E, A>) => STM<R, E, Chunk<A>>;
```

### replicateSTMDiscard

Performs this transaction the specified number of times, discarding the
results.

```ts
export declare const replicateSTMDiscard: (n: number) => <R, E, A>(self: STM<R, E, A>) => STM<R, E, void>;
```

### retry

Abort and retry the whole transaction when any of the underlying
transactional variables have changed.

```ts
export declare const retry: STM<never, never, never>;
```

### retryUntil

Filters the value produced by this effect, retrying the transaction until
the predicate returns true for the value.

```ts
export declare const retryUntil: <A>(f: Predicate<A>) => <R, E>(self: STM<R, E, A>) => STM<R, E, A>;
```

### retryWhile

Filters the value produced by this effect, retrying the transaction while
the predicate returns true for the value.

```ts
export declare const retryWhile: <A>(f: Predicate<A>) => <R, E>(self: STM<R, E, A>) => STM<R, E, A>;
```

### right

"Zooms in" on the value in the `Right` side of an `Either`, moving the
possibility that the value is a `Left` to the error channel.

```ts
export declare const right: <R, E, A, B>(self: STM<R, E, Either<A, B>>) => STM<R, Either<A, E>, B>;
```

### service

Accesses the specified service in the environment of the effect.

Especially useful for creating "accessor" methods on services' companion
objects.

```ts
export declare const service: <T>(tag: Tag<T>) => STM<T, never, T>;
```

### serviceWith

Accesses the specified service in the environment of the effect.

Especially useful for creating "accessor" methods on services' companion
objects.

```ts
export declare const serviceWith: <T, A>(tag: Tag<T>, f: (a: T) => A) => STM<T, never, A>;
```

### serviceWithSTM

STMfully accesses the specified service in the environment of the
effect.

Especially useful for creating "accessor" methods on services' companion
objects.

```ts
export declare const serviceWithSTM: <T>(tag: Tag<T>) => <R, E, A>(f: (a: T) => STM<R, E, A>) => STM<T | R, E, A>;
```

### some

Converts an option on values into an option on errors.

```ts
export declare const some: <R, E, A>(self: STM<R, E, Maybe<A>>) => STM<R, Maybe<E>, A>;
```

### someOrElse

Extracts the optional value, or returns the given 'orElse'.

```ts
export declare const someOrElse: <B>(orElse: LazyArg<B>) => <R, E, A>(self: STM<R, E, Maybe<A>>) => STM<R, E, B | A>;
```

### someOrElseSTM

Extracts the optional value, or executes the effect 'orElse'.

```ts
export declare const someOrElseSTM: <R2, E2, B>(orElse: LazyArg<STM<R2, E2, B>>) => <R, E, A>(self: STM<R, E, Maybe<A>>) => STM<R2 | R, E2 | E, B | A>;
```

### someOrFail

Extracts the optional value, or fails with the given error 'e'.

```ts
export declare const someOrFail: <E2>(orFail: LazyArg<E2>) => <R, E, A>(self: STM<R, E, Maybe<A>>) => STM<R, E2 | E, A>;
```

### someOrFailException

Extracts the optional value, or fails with a `NoSuchElement` exception.

```ts
export declare const someOrFailException: <R, E, A>(self: STM<R, E, Maybe<A>>) => STM<R, NoSuchElement | E, A>;
```

### struct

Applicative structure.

```ts
export declare const struct: <NER extends Record<string, STM<any, any, any>>>(r: EnforceNonEmptyRecord<NER> & Record<string, STM<any, any, any>>) => STM<[NER[keyof NER]] extends [{ [_R]: () => infer R; }] ? R : never, [NER[keyof NER]] extends [{ [_E]: () => infer E; }] ? E : never, { [K in keyof NER]: [NER[K]] extends [STM<any, any, infer A>] ? A : never; }>;
```

### succeed

Returns an `STM` effect that succeeds with the specified value.

```ts
export declare const succeed: <A>(a: A) => STM<never, never, A>;
```

### succeedLeft

Returns an effect with the value on the left part.

```ts
export declare const succeedLeft: <A>(value: A) => USTM<Either<A, never>>;
```

### succeedNone

Returns an effect with the empty value.

```ts
export declare const succeedNone: USTM<Maybe<never>>;
```

### succeedRight

Returns an effect with the value on the right part.

```ts
export declare const succeedRight: <A>(value: A) => USTM<Either<never, A>>;
```

### succeedSome

Returns an effect with the optional value.

```ts
export declare const succeedSome: <A>(a: A) => USTM<Maybe<A>>;
```

### summarized

Summarizes a `STM` effect by computing a provided value before and after
execution, and then combining the values to produce a summary, together
with the result of execution.

```ts
export declare const summarized: <R2, E2, B, C>(summary: STM<R2, E2, B>, f: (start: B, end: B) => C) => <R, E, A>(self: STM<R, E, A>) => STM<R2 | R, E2 | E, readonly [C, A]>;
```

### suspend

Suspends creation of the specified transaction lazily.

```ts
export declare const suspend: <R, E, A>(f: LazyArg<STM<R, E, A>>) => STM<R, E, A>;
```

### sync

Returns an `STM` effect that succeeds with the specified value.

```ts
export declare const sync: <A>(a: LazyArg<A>) => STM<never, never, A>;
```

### tap

"Peeks" at the success of transactional effect.

```ts
export declare const tap: <A, R2, E2, X>(f: (a: A) => STM<R2, E2, X>) => <R, E>(self: STM<R, E, A>) => STM<R2 | R, E2 | E, A>;
```

### tapBoth

"Peeks" at both sides of an transactional effect.

```ts
export declare const tapBoth: <E, R2, E2, X, A, R3, E3, X1>(f: (e: E) => STM<R2, E2, X>, g: (a: A) => STM<R3, E3, X1>) => <R>(self: STM<R, E, A>) => STM<R2 | R3 | R, E | E2 | E3, A>;
```

### tapError

"Peeks" at the error of the transactional effect.

```ts
export declare const tapError: <E, R2, E2, X>(f: (e: E) => STM<R2, E2, X>) => <R, A>(self: STM<R, E, A>) => STM<R2 | R, E | E2, A>;
```

### tryCatch

Imports a synchronous side-effect into a pure value, translating any
thrown exceptions into typed failed effects.

```ts
export declare const tryCatch: <E, A>(attempt: LazyArg<A>, onThrow: (u: unknown) => E) => STM<never, E, A>;
```

### tuple

Like `forEach` + `identity` with a tuple type.

```ts
export declare const tuple: <T extends NonEmptyArraySTM>(...t: T & { 0: STM<any, any, any>; }) => STM<[T[number]] extends [{ [_R]: () => infer R; }] ? R : never, [T[number]] extends [{ [_E]: () => infer E; }] ? E : never, TupleA<T>>;
```

### unifySTM

```ts
export declare const unifySTM: <X extends STM<any, any, any>>(self: X) => STM<[X] extends [{ [_R]: () => infer R; }] ? R : never, [X] extends [{ [_E]: () => infer E; }] ? E : never, [X] extends [{ [_A]: () => infer A; }] ? A : never>;
```

### unit

Ignores the result of the transactional effect replacing it with `undefined`.

```ts
export declare const unit: <R, E, X>(self: STM<R, E, X>) => STM<R, E, void>;
```

### unit_

Returns an `STM` effect that succeeds with `undefined`.

```ts
export declare const unit_: USTM<void>;
```

### unleft

Converts a `STM<R, Either<E, B>, A>` into a `STM<R, E, Either<A, B>>`.
The inverse of `left`.

```ts
export declare const unleft: <R, E, B, A>(self: STM<R, Either<E, B>, A>) => STM<R, E, Either<A, B>>;
```

### unless

The moral equivalent of `if (!p) exp`

```ts
export declare const unless: (predicate: LazyArg<boolean>) => <R, E, A>(self: STM<R, E, A>) => STM<R, E, Maybe<A>>;
```

### unlessSTM

The moral equivalent of `if (!p) exp` when `p` has side-effects.

```ts
export declare const unlessSTM: <R2, E2>(predicate: LazyArg<STM<R2, E2, boolean>>) => <R, E, A>(self: STM<R, E, A>) => STM<R2 | R, E2 | E, Maybe<A>>;
```

### unright

Converts a `STM<R, Either<B, E>, A>` into a `STM<R, E, Either<B, A>>`.
The inverse of `right`.

```ts
export declare const unright: <R, B, E, A>(self: STM<R, Either<B, E>, A>) => STM<R, E, Either<B, A>>;
```

### unsome

Converts an option on errors into an option on values.

```ts
export declare const unsome: <R, E, A>(self: STM<R, Maybe<E>, A>) => STM<R, E, Maybe<A>>;
```

### updateService

Updates the service with the required service entry.

```ts
export declare const updateService: <T, T1 extends T>(tag: Tag<T>, f: (service: T) => T1) => <R, E, A>(self: STM<R, E, A>) => STM<T | R, E, A>;
```

### validate

Feeds elements of type `A` to `f` and accumulates all errors in error
channel or successes in success channel.

This combinator is lossy meaning that if there are errors all successes
will be lost. To retain all information please use `partition`.

```ts
export declare const validate: <R, E, A, B>(as: Collection<A>, f: (a: A) => STM<R, E, B>) => STM<R, Chunk<E>, Chunk<B>>;
```

### validateFirst

Feeds elements of type `A` to `f` until it succeeds. Returns first success
or the accumulation of all errors.

```ts
export declare const validateFirst: <R, E, A, B>(as: Collection<A>, f: (a: A) => STM<R, E, B>) => STM<R, Chunk<E>, B>;
```

### when

The moral equivalent of `if (p) exp`.

```ts
export declare const when: <R, E, A>(predicate: LazyArg<boolean>, effect: STM<R, E, A>) => STM<R, E, Maybe<A>>;
```

### whenCase

Runs an effect when the supplied partial function matches for the given
value, otherwise does nothing.

```ts
export declare const whenCase: <R, E, A, B>(a: LazyArg<A>, pf: (a: A) => Maybe<STM<R, E, B>>) => STM<R, E, Maybe<B>>;
```

### whenCaseSTM

Runs an effect when the supplied partial function matches for the given
value, otherwise does nothing.

```ts
export declare const whenCaseSTM: <R, E, A, R1, E1, B>(stm: STM<R, E, A>, pf: (a: A) => Maybe<STM<R1, E1, B>>) => STM<R | R1, E | E1, Maybe<B>>;
```

### whenSTM

The moral equivalent of `if (p) exp` when `p` has side-effects.

```ts
export declare const whenSTM: <R, E, R1, E1, A>(predicate: STM<R, E, boolean>, effect: STM<R1, E1, A>) => STM<R | R1, E | E1, Maybe<A>>;
```

### zip

Sequentially zips this value with the specified one.

```ts
export declare const zip: <R1, E1, A1>(that: STM<R1, E1, A1>) => <R, E, A>(self: STM<R, E, A>) => STM<R1 | R, E1 | E, readonly [A, A1]>;
```

### zipFlatten

Sequentially zips this transactional effect with the that transactional
effect.

```ts
export declare const zipFlatten: <R2, E2, A2>(that: STM<R2, E2, A2>) => <R, E, A extends readonly any[]>(self: STM<R, E, A>) => STM<R2 | R, E2 | E, readonly [...A, A2]>;
```

### zipLeft

Sequentially zips this value with the specified one, discarding the second
element of the tuple.

```ts
export declare const zipLeft: <R1, E1, A1>(that: STM<R1, E1, A1>) => <R, E, A>(self: STM<R, E, A>) => STM<R1 | R, E1 | E, A>;
```

### zipRight

Sequentially zips this value with the specified one, discarding the first
element of the tuple.

```ts
export declare const zipRight: <R1, E1, A1>(that: STM<R1, E1, A1>) => <R, E, A>(self: STM<R, E, A>) => STM<R1 | R, E1 | E, A1>;
```

### zipWith

Sequentially zips this value with the specified one, combining the values
using the specified combiner function.

```ts
export declare const zipWith: <R1, E1, A1, A, A2>(that: STM<R1, E1, A1>, f: (a: A, b: A1) => A2) => <R, E>(self: STM<R, E, A>) => STM<R1 | R, E1 | E, A2>;
```

