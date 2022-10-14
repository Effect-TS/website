## Cause

Reference Documentation for the module '@effect/core/io/Cause'

### as

Maps the error value of this cause to the specified constant value.

```ts
/**
 * @tsplus static effect/core/io/Cause.Aspects as
 * @tsplus pipeable effect/core/io/Cause as
 */
export declare const as: <E1>(error: E1) => <E>(self: Cause<E>) => Cause<E1>;
```

### combinePar

```ts
/**
 * @tsplus operator effect/core/io/Cause &
 * @tsplus static effect/core/io/Cause.Ops both
 */
export declare const combinePar: <E1, E2>(left: Cause<E1>, right: Cause<E2>) => Cause<E1 | E2>;
```

### combineSeq

```ts
/**
 * @tsplus operator effect/core/io/Cause +
 * @tsplus static effect/core/io/Cause.Ops then
 */
export declare const combineSeq: <E1, E2>(left: Cause<E1>, right: Cause<E2>) => Cause<E1 | E2>;
```

### contains

Determines if this cause contains or is equal to the specified cause.

```ts
/**
 * @tsplus static effect/core/io/Cause.Aspects contains
 * @tsplus pipeable effect/core/io/Cause contains
 */
export declare const contains: <E1>(that: Cause<E1>) => <E>(self: Cause<E>) => boolean;
```

### defects

Extracts a list of non-recoverable errors from the `Cause`.

```ts
/**
 * @tsplus getter effect/core/io/Cause defects
 */
export declare const defects: <E>(self: Cause<E>) => List<unknown>;
```

### die

```ts
/**
 * @tsplus static effect/core/io/Cause.Ops die
 */
export declare const die: (defect: unknown) => Cause<never>;
```

### dieMaybe

Returns the value associated with the first `Die` in this `Cause` if
one exists.

```ts
/**
 * @tsplus getter effect/core/io/Cause dieMaybe
 */
export declare const dieMaybe: <E>(self: Cause<E>) => Maybe<unknown>;
```

### empty

```ts
/**
 * @tsplus static effect/core/io/Cause.Ops empty
 */
export declare const empty: Cause<never>;
```

### fail

```ts
/**
 * @tsplus static effect/core/io/Cause.Ops fail
 */
export declare const fail: <E>(error: E) => Cause<E>;
```

### failureMaybe

Returns the `E` associated with the first `Fail` in this `Cause` if one
exists.

```ts
/**
 * @tsplus getter effect/core/io/Cause failureMaybe
 */
export declare const failureMaybe: <E>(self: Cause<E>) => Maybe<E>;
```

### failureOrCause

Retrieve the first checked error on the `Left` if available, if there are
no checked errors return the rest of the `Cause` that is known to contain
only `Die` or `Interrupt` causes.

```ts
/**
 * @tsplus getter effect/core/io/Cause failureOrCause
 */
export declare const failureOrCause: <E>(self: Cause<E>) => Either<E, Cause<never>>;
```

### failures

Produces a list of all recoverable errors `E` in the `Cause`.

```ts
/**
 * @tsplus getter effect/core/io/Cause failures
 */
export declare const failures: <E>(self: Cause<E>) => List<E>;
```

### find

Finds something and extracts some details from it.

```ts
/**
 * @tsplus static effect/core/io/Cause.Aspects find
 * @tsplus pipeable effect/core/io/Cause find
 */
export declare const find: <E, Z>(f: (cause: Cause<E>) => Maybe<Z>) => (self: Cause<E>) => Maybe<Z>;
```

### flatMap

Transforms each error value in this cause to a new cause with the specified
function and then flattens the nested causes into a single cause.

```ts
/**
 * @tsplus static effect/core/io/Cause.Aspects flatMap
 * @tsplus pipeable effect/core/io/Cause flatMap
 */
export declare const flatMap: <E, E1>(f: (e: E) => Cause<E1>) => (self: Cause<E>) => Cause<E1>;
```

### flatten

Flattens a nested cause.

```ts
/**
 * @tsplus getter effect/core/io/Cause flatten
 */
export declare const flatten: <E>(self: Cause<Cause<E>>) => Cause<E>;
```

### flipCauseMaybe

Converts the specified `Cause<Maybe<E>>` to an `Maybe[Cause[E]]` by
recursively stripping out any failures with the error `None`.

```ts
/**
 * @tsplus static effect/core/io/Cause.Ops flipCauseMaybe
 */
export declare const flipCauseMaybe: <E>(cause: Cause<Maybe<E>>) => Maybe<Cause<E>>;
```

### fold

Folds over the cases of this cause with the specified functions.

```ts
/**
 * @tsplus static effect/core/io/Cause.Aspects fold
 * @tsplus pipeable effect/core/io/Cause fold
 */
export declare const fold: <E, Z>(onEmptyCause: Z, onFailCause: (e: E) => Z, onDieCause: (e: unknown) => Z, onInterruptCause: (fiberId: FiberId) => Z, onThenCause: (x: Z, y: Z) => Z, onBothCause: (x: Z, y: Z) => Z, onStacklessCause: (z: Z, stackless: boolean) => Z) => (self: Cause<E>) => Z;
```

### foldLeft

Folds over the cause to statefully compute a value.

```ts
/**
 * @tsplus static effect/core/io/Cause.Aspects foldLeft
 * @tsplus pipeable effect/core/io/Cause foldLeft
 */
export declare const foldLeft: <E, Z>(initial: Z, f: (z: Z, cause: Cause<E>) => Maybe<Z>) => (self: Cause<E>) => Z;
```

### interrupt

```ts
/**
 * @tsplus static effect/core/io/Cause.Ops interrupt
 */
export declare const interrupt: (fiberId: FiberId) => Cause<never>;
```

### interruptMaybe

Returns the `FiberId` associated with the first `Interrupt` in this `Cause`
if one exists.

```ts
/**
 * @tsplus getter effect/core/io/Cause interruptMaybe
 */
export declare const interruptMaybe: <E>(self: Cause<E>) => Maybe<FiberId>;
```

### interruptors

Returns a set of interruptors, fibers that interrupted the fiber described
by this `Cause`.

```ts
/**
 * @tsplus getter effect/core/io/Cause interruptors
 */
export declare const interruptors: <E>(self: Cause<E>) => HashSet<FiberId>;
```

### isBothType

```ts
/**
 * @tsplus fluent effect/core/io/Cause isBothType
 */
export declare const isBothType: <E>(cause: Cause<E>) => cause is Both<E>;
```

### isCause

Determines if the provided value is a `Cause`.

```ts
/**
 * @tsplus fluent effect/core/io/Cause isCause
 */
export declare const isCause: (self: unknown) => self is Cause<unknown>;
```

### isChannelError

```ts
export declare const isChannelError: (u: unknown) => u is ChannelError<unknown>;
```

### isDie

Determines if the `Cause` contains a die.

```ts
/**
 * @tsplus getter effect/core/io/Cause isDie
 */
export declare const isDie: <E>(self: Cause<E>) => boolean;
```

### isDieType

```ts
/**
 * @tsplus fluent effect/core/io/Cause isDieType
 */
export declare const isDieType: <E>(cause: Cause<E>) => cause is Die;
```

### isEmpty

Determines if the `Cause` is empty.

```ts
/**
 * @tsplus getter effect/core/io/Cause isEmpty
 */
export declare const isEmpty: <E>(cause: Cause<E>) => boolean;
```

### isEmptyType

```ts
/**
 * @tsplus fluent effect/core/io/Cause isEmptyType
 */
export declare const isEmptyType: <E>(cause: Cause<E>) => cause is Empty;
```

### isFailType

```ts
/**
 * @tsplus fluent effect/core/io/Cause isFailType
 */
export declare const isFailType: <E>(cause: Cause<E>) => cause is Fail<E>;
```

### isFailure

Determines if the `Cause` contains a failure.

```ts
/**
 * @tsplus getter effect/core/io/Cause isFailure
 */
export declare const isFailure: <E>(self: Cause<E>) => boolean;
```

### isFiberFailure

```ts
export declare const isFiberFailure: (u: unknown) => u is FiberFailure<unknown>;
```

### isIllegalArgumentException

```ts
export declare const isIllegalArgumentException: (u: unknown) => u is IllegalArgumentException;
```

### isIllegalStateException

```ts
export declare const isIllegalStateException: (u: unknown) => u is IllegalStateException;
```

### isInterruptType

```ts
/**
 * @tsplus fluent effect/core/io/Cause isInterruptType
 */
export declare const isInterruptType: <E>(cause: Cause<E>) => cause is Interrupt;
```

### isInterrupted

Determines if the `Cause` contains an interruption.

```ts
/**
 * @tsplus getter effect/core/io/Cause isInterrupted
 */
export declare const isInterrupted: <E>(self: Cause<E>) => boolean;
```

### isInterruptedException

```ts
export declare const isInterruptedException: (u: unknown) => u is InterruptedException;
```

### isInterruptedOnly

Determines if the `Cause` contains only interruptions and not any `Die` or
`Fail` causes.

```ts
/**
 * @tsplus getter effect/core/io/Cause isInterruptedOnly
 */
export declare const isInterruptedOnly: <E>(self: Cause<E>) => boolean;
```

### isRuntime

```ts
export declare const isRuntime: (u: unknown) => u is RuntimeError;
```

### isStacklessType

```ts
/**
 * @tsplus fluent effect/core/io/Cause isStacklessType
 */
export declare const isStacklessType: <E>(cause: Cause<E>) => cause is Stackless<E>;
```

### isThenType

```ts
/**
 * @tsplus fluent effect/core/io/Cause isThenType
 */
export declare const isThenType: <E>(cause: Cause<E>) => cause is Then<E>;
```

### keepDefects

Remove all `Fail` and `Interrupt` nodes from this `Cause`, return only
`Die` cause/finalizer defects.

```ts
/**
 * @tsplus getter effect/core/io/Cause keepDefects
 */
export declare const keepDefects: <E>(self: Cause<E>) => Maybe<Cause<never>>;
```

### linearize

Linearizes this cause to a set of parallel causes where each parallel cause
contains a linear sequence of failures.

```ts
/**
 * @tsplus getter effect/core/io/Cause linearize
 */
export declare const linearize: <E>(self: Cause<E>) => HashSet<Cause<E>>;
```

### map

Transforms the error type of this cause with the specified function.

```ts
/**
 * @tsplus static effect/core/io/Cause.Aspects map
 * @tsplus pipeable effect/core/io/Cause map
 */
export declare const map: <E, E1>(f: (e: E) => E1) => (self: Cause<E>) => Cause<E1>;
```

### realCause

```ts
/**
 * @tsplus macro remove
 */
export declare const realCause: <E>(cause: Cause<E>) => asserts cause is RealCause<E>;
```

### squash

Squashes a `Cause` down to a single `Error`, chosen to be the "most
important" `Error`.

```ts
/**
 * @tsplus getter effect/core/io/Cause squash
 */
export declare const squash: <E>(self: Cause<E>) => Error;
```

### squashWith

Squashes a `Cause` down to a single defect, chosen to be the "most
important" defect.

```ts
/**
 * @tsplus static effect/core/io/Cause.Aspects squashWith
 * @tsplus pipeable effect/core/io/Cause squashWith
 */
export declare const squashWith: <E>(f: (e: E) => unknown) => (self: Cause<E>) => unknown;
```

### stack

```ts
/**
 * @tsplus static effect/core/io/Cause.Ops stack
 */
export declare const stack: <E>(cause: Cause<E>) => Cause<E>;
```

### stackless

```ts
/**
 * @tsplus static effect/core/io/Cause.Ops stackless
 */
export declare const stackless: <E>(cause: Cause<E>) => Cause<E>;
```

### stripFailures

Discards all typed failures kept on this `Cause`.

```ts
/**
 * @tsplus getter effect/core/io/Cause stripFailures
 */
export declare const stripFailures: <E>(self: Cause<E>) => Cause<never>;
```

### stripSomeDefects

Remove all `Die` causes that the specified partial function is defined at,
returning `Some` with the remaining causes or `None` if there are no
remaining causes.

```ts
/**
 * @tsplus static effect/core/io/Cause.Aspects stripSomeDefects
 * @tsplus pipeable effect/core/io/Cause stripSomeDefects
 */
export declare const stripSomeDefects: (pf: (defect: unknown) => unknown) => <E>(cause: Cause<E>) => Maybe<Cause<E>>;
```

### unifyCause

```ts
/**
 * @tsplus unify effect/core/io/Cause
 */
export declare const unifyCause: <X extends Cause<any>>(self: X) => Cause<[X] extends [{ [_E]: () => infer E; }] ? E : never>;
```

