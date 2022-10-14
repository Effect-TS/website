## FiberId

Reference Documentation for the module '@effect/core/io/FiberId'

### combine

Combine two `FiberId`s.

```ts
/**
 * @tsplus pipeable-operator effect/core/io/FiberId +
 * @tsplus static effect/core/io/FiberId.Aspects combine
 * @tsplus pipeable effect/core/io/FiberId combine
 */
export declare const combine: (that: FiberId) => (self: FiberId) => FiberId;
```

### combineAll

Combines a set of `FiberId`s into a single `FiberId`.

```ts
/**
 * @tsplus static effect/core/io/FiberId.Ops combineAll
 */
export declare const combineAll: (fiberIds: HashSet<FiberId>) => FiberId;
```

### getOrElse

Returns this `FiberId` if it is not `None`, otherwise returns that `FiberId`.

```ts
/**
 * @tsplus static effect/core/io/FiberId.Aspects getOrElse
 * @tsplus pipeable effect/core/io/FiberId getOrElse
 */
export declare const getOrElse: (that: LazyArg<FiberId>) => (self: FiberId) => FiberId;
```

### ids

Get the set of identifiers for this `FiberId`.

```ts
/**
 * @tsplus getter effect/core/io/FiberId ids
 */
export declare const ids: (self: FiberId) => HashSet<number>;
```

### isFiberId

Checks if the specified unknown value is a `FiberId`.

```ts
/**
 * @tsplus static effect/core/io/FiberId.Ops isFiberId
 */
export declare const isFiberId: (self: unknown) => self is FiberId;
```

### isNone

Determines if the `FiberId` is a `None`.

```ts
/**
 * @tsplus fluent effect/core/io/FiberId isNone
 */
export declare const isNone: (self: FiberId) => self is None;
```

### make

```ts
/**
 * @tsplus static effect/core/io/FiberId.Ops __call
 */
export declare const make: (id: number, startTimeSeconds: number) => FiberId;
```

### none

```ts
/**
 * @tsplus static effect/core/io/FiberId.Ops none
 */
export declare const none: FiberId;
```

### realFiberId

```ts
/**
 * @tsplus macro remove
 */
export declare const realFiberId: (_: FiberId) => asserts _ is RealFiberId;
```

### threadName

Creates a string representing the name of the current thread of execution
represented by the specified `FiberId`.

```ts
/**
 * @tsplus getter effect/core/io/FiberId threadName
 */
export declare const threadName: (self: FiberId) => string;
```

### toMaybe

Convert a `FiberId` into an `Maybe<FiberId>`.

```ts
/**
 * @tsplus getter effect/core/io/FiberId toMaybe
 */
export declare const toMaybe: (self: FiberId) => Maybe<FiberId>;
```

### unsafeMake

```ts
/**
 * @tsplus static effect/core/io/FiberId.Ops unsafeMake
 */
export declare const unsafeMake: () => RuntimeFiberId;
```

