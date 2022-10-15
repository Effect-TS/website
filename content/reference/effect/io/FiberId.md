## FiberId

Reference Documentation for the module '@effect/io/FiberId'

```ts
export interface FiberId extends Equals {
    readonly [FiberIdSym]: FiberIdSym;
}
```

## Method

### combine

Combine two `FiberId`s.

```ts
export declare const combine: (that: FiberId) => (self: FiberId) => FiberId;
```

### combineAll

Combines a set of `FiberId`s into a single `FiberId`.

```ts
export declare const combineAll: (fiberIds: HashSet<FiberId>) => FiberId;
```

### getOrElse

Returns this `FiberId` if it is not `None`, otherwise returns that `FiberId`.

```ts
export declare const getOrElse: (that: LazyArg<FiberId>) => (self: FiberId) => FiberId;
```

### ids

Get the set of identifiers for this `FiberId`.

```ts
export declare const ids: (self: FiberId) => HashSet<number>;
```

### isFiberId

Checks if the specified unknown value is a `FiberId`.

```ts
export declare const isFiberId: (self: unknown) => self is FiberId;
```

### isNone

Determines if the `FiberId` is a `None`.

```ts
export declare const isNone: (self: FiberId) => self is None;
```

### make

```ts
export declare const make: (id: number, startTimeSeconds: number) => FiberId;
```

### none

```ts
export declare const none: FiberId;
```

### realFiberId

```ts
export declare const realFiberId: (_: FiberId) => asserts _ is RealFiberId;
```

### threadName

Creates a string representing the name of the current thread of execution
represented by the specified `FiberId`.

```ts
export declare const threadName: (self: FiberId) => string;
```

### toMaybe

Convert a `FiberId` into an `Maybe<FiberId>`.

```ts
export declare const toMaybe: (self: FiberId) => Maybe<FiberId>;
```

### unsafeMake

```ts
export declare const unsafeMake: () => RuntimeFiberId;
```

