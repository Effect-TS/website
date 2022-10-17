## TArray

```ts
export interface TArray<A> {
    readonly [TArraySym]: TArraySym;
    readonly [_A]: () => A;
}
```

## General API

### collectFirst

Finds the result of applying a partial function to the first value in its
domain.

```ts
export declare const collectFirst: <A, B>(pf: (a: A) => Maybe<B>) => (self: TArray<A>) => STM<never, never, Maybe<B>>;
```

### collectFirstSTM

Finds the result of applying an transactional partial function to the first
value in its domain.

```ts
export declare const collectFirstSTM: <A, E, B>(pf: (a: A) => Maybe<STM<never, E, B>>) => (self: TArray<A>) => STM<never, E, Maybe<B>>;
```

### contains

Determine if the array contains a specified value.

```ts
export declare const contains: <A>(equal: Equivalence<A>, value: A) => (self: TArray<A>) => STM<never, never, boolean>;
```

### count

Count the values in the array matching a predicate.

```ts
export declare const count: <A>(f: Predicate<A>) => (self: TArray<A>) => STM<never, never, number>;
```

### countSTM

Count the values in the array matching a transactional predicate.

```ts
export declare const countSTM: <E, A>(f: (a: A) => STM<never, E, boolean>) => (self: TArray<A>) => STM<never, E, number>;
```

### empty

Makes a new `TArray` that is initialized with specified values.

```ts
export declare const empty: <A>() => STM<never, never, TArray<A>>;
```

### exists

Determine if the array contains a value satisfying a predicate.

```ts
export declare const exists: <A>(f: Predicate<A>) => (self: TArray<A>) => STM<never, never, boolean>;
```

### existsSTM

Determine if the array contains a value satisfying a transactional
predicate.

```ts
export declare const existsSTM: <E, A>(f: (a: A) => STM<never, E, boolean>) => (self: TArray<A>) => STM<never, E, boolean>;
```

### find

Find the first element in the array matching a predicate.

```ts
export declare const find: <A>(p: Predicate<A>) => (self: TArray<A>) => STM<never, never, Maybe<A>>;
```

### findLast

Find the last element in the array matching a predicate.

```ts
export declare const findLast: <A>(f: Predicate<A>) => (self: TArray<A>) => STM<never, never, Maybe<A>>;
```

### findLastSTM

Find the last element in the array matching a transactional predicate.

```ts
export declare const findLastSTM: <E, A>(f: (a: A) => STM<never, E, boolean>) => (self: TArray<A>) => STM<never, E, Maybe<A>>;
```

### findSTM

Find the first element in the array matching a transactional predicate.

```ts
export declare const findSTM: <E, A>(f: (a: A) => STM<never, E, boolean>) => (self: TArray<A>) => STM<never, E, Maybe<A>>;
```

### firstMaybe

The first entry of the array, if it exists.

```ts
export declare const firstMaybe: <A>(self: TArray<A>) => USTM<Maybe<A>>;
```

### forAll

Atomically evaluate the conjunction of a predicate across the members of
the array.

```ts
export declare const forAll: <A>(f: Predicate<A>) => (self: TArray<A>) => STM<never, never, boolean>;
```

### forAllSTM

Atomically evaluate the conjunction of a transactional predicate across the
members of the array.

```ts
export declare const forAllSTM: <E, A>(f: (a: A) => STM<never, E, boolean>) => (self: TArray<A>) => STM<never, E, boolean>;
```

### forEach

Atomically performs transactional effect for each item in array.

```ts
export declare const forEach: <E, A>(f: (a: A) => STM<never, E, void>) => (self: TArray<A>) => STM<never, E, void>;
```

### from

Makes a new `TArray` initialized with provided `Collection`.

```ts
export declare const from: <A>(it: Collection<A>) => STM<never, never, TArray<A>>;
```

### get

Extracts value from ref in array.

```ts
export declare const get: <A>(index: number) => (self: TArray<A>) => STM<never, never, A>;
```

### indexOf

Get the first index of a specific value in the array or -1 if it does not
occur.

```ts
export declare const indexOf: <A>(equivalence: Equivalence<A>, value: A) => (self: TArray<A>) => STM<never, never, number>;
```

### indexWhere

Get the index of the first entry in the array matching a predicate.

```ts
export declare const indexWhere: <A>(f: Predicate<A>) => (self: TArray<A>) => STM<never, never, number>;
```

### indexWhereFrom

Get the index of the first entry in the array, starting at a specific
index, matching a predicate.

```ts
export declare const indexWhereFrom: <A>(f: Predicate<A>, from: number) => (self: TArray<A>) => STM<never, never, number>;
```

### indexWhereFromSTM

Starting at specified index, get the index of the next entry that matches a
transactional predicate.

```ts
export declare const indexWhereFromSTM: <E, A>(f: (a: A) => STM<never, E, boolean>, from: number) => (self: TArray<A>) => STM<never, E, number>;
```

### indexWhereSTM

Get the index of the next entry that matches a transactional predicate.

```ts
export declare const indexWhereSTM: <E, A>(f: (a: A) => STM<never, E, boolean>) => (self: TArray<A>) => STM<never, E, number>;
```

### isEmpty

Checks if the array is empty.

```ts
export declare const isEmpty: <A>(self: TArray<A>) => boolean;
```

### lastIndexOf

Get the first index of a specific value in the arrayor -1 if it does not
occur.

```ts
export declare const lastIndexOf: <A>(equivalence: Equivalence<A>, value: A) => (self: TArray<A>) => STM<never, never, number>;
```

### lastIndexOfFrom

Get the first index of a specific value in the array, bounded above by a
specific index, or -1 if it does not occur.

```ts
export declare const lastIndexOfFrom: <A>(equivalence: Equivalence<A>, value: A, end: number) => (self: TArray<A>) => USTM<number>;
```

### lastMaybe

The last entry in the array, if it exists.

```ts
export declare const lastMaybe: <A>(self: TArray<A>) => USTM<Maybe<A>>;
```

### length

```ts
export declare const length: <A>(self: TArray<A>) => number;
```

### make

Makes a new `TArray` that is initialized with specified values.

```ts
export declare const make: <ARGS extends any[]>(...data: ARGS) => STM<never, never, TArray<ARGS[number]>>;
```

### minMaybe

Atomically compute the least element in the array, if it exists.

```ts
export declare const minMaybe: <A>(ord: Ord<A>) => (self: TArray<A>) => STM<never, never, Maybe<A>>;
```

### reduce

Atomically folds using a pure function.

```ts
export declare const reduce: <A, Z>(zero: Z, f: (z: Z, a: A) => Z) => (self: TArray<A>) => STM<never, never, Z>;
```

### reduceMaybe

Atomically reduce the array, if non-empty, by a binary operator.

```ts
export declare const reduceMaybe: <A>(f: (x: A, y: A) => A) => (self: TArray<A>) => STM<never, never, Maybe<A>>;
```

### reduceMaybeSTM

Atomically reduce the non-empty array using a transactional binary
operator.

```ts
export declare const reduceMaybeSTM: <E, A>(f: (x: A, y: A) => STM<never, E, A>) => (self: TArray<A>) => STM<never, E, Maybe<A>>;
```

### reduceSTM

Atomically folds using a transactional function.

```ts
export declare const reduceSTM: <E, A, Z>(zero: Z, f: (z: Z, a: A) => STM<never, E, Z>) => (self: TArray<A>) => STM<never, E, Z>;
```

### toChunk

Collects all elements into a chunk.

```ts
export declare const toChunk: <A>(self: TArray<A>) => USTM<Chunk<A>>;
```

### transform

Atomically updates all elements using a pure function.

```ts
export declare const transform: <A>(f: (a: A) => A) => (self: TArray<A>) => STM<never, never, void>;
```

### transformSTM

Atomically updates all elements using a transactional effect.

```ts
export declare const transformSTM: <E, A>(f: (a: A) => STM<never, E, A>) => (self: TArray<A>) => STM<never, E, void>;
```

### update

Updates element in the array with given function.

```ts
export declare const update: <A>(index: number, f: (a: A) => A) => (self: TArray<A>) => STM<never, never, void>;
```

### updateSTM

Atomically updates element in the array with given transactional effect.

```ts
export declare const updateSTM: <E, A>(index: number, f: (a: A) => STM<never, E, A>) => (self: TArray<A>) => STM<never, E, void>;
```

