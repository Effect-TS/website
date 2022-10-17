## TSet

Transactional set implemented on top of TMap.

```ts
export interface TSet<A> {
    readonly [TSetSym]: TSetSym;
    readonly [_A]: () => A;
}
```

## General API

### contains

Tests whether or not set contains an element.

```ts
export declare const contains: <A>(value: A) => (self: TSet<A>) => STM<never, never, boolean>;
```

### delete

```ts
export declare const delete: <A>(value: A) => (self: TSet<A>) => STM<never, never, void>;
```

### deleteAll

Removes elements from the set.

```ts
export declare const deleteAll: <A>(as: Collection<A>) => (self: TSet<A>) => STM<never, never, void>;
```

### diff

Atomically transforms the set into the difference of itself and the
provided set.

```ts
export declare const diff: <A>(other: TSet<A>) => (self: TSet<A>) => STM<never, never, void>;
```

### empty

Makes an empty `TSet`.

```ts
export declare const empty: <A>() => USTM<TSet<A>>;
```

### fold

Atomically folds using a pure function.

```ts
export declare const fold: <A, B>(zero: B, op: (acc: B, a: A) => B) => (self: TSet<A>) => STM<never, never, B>;
```

### foldSTM

Atomically folds using a transactional function.

```ts
export declare const foldSTM: <B, A, R, E>(zero: B, op: (acc: B, a: A) => STM<R, E, B>) => (self: TSet<A>) => STM<R, E, B>;
```

### forEach

Atomically performs transactional-effect for each element in set.

```ts
export declare const forEach: <A, R, E>(f: (a: A) => STM<R, E, void>) => (self: TSet<A>) => STM<R, E, void>;
```

### fromIterable

Makes a new `TSet` initialized with provided iterable.

```ts
export declare const fromIterable: <A>(data: Collection<A>) => USTM<TSet<A>>;
```

### intersect

Atomically transforms the set into the intersection of itself and the
provided set.

```ts
export declare const intersect: <A>(other: TSet<A>) => (self: TSet<A>) => STM<never, never, void>;
```

### isEmpty

Tests if the map is empty or not

```ts
export declare const isEmpty: <A>(self: TSet<A>) => USTM<boolean>;
```

### make

Makes a new `TSet` that is initialized with specified values.

```ts
export declare const make: <A>(...data: A[]) => USTM<TSet<A>>;
```

### put

Stores new element in the set.

```ts
export declare const put: <A>(value: A) => (self: TSet<A>) => STM<never, never, void>;
```

### removeIf

Removes bindings matching predicate and returns the removed entries.

```ts
export declare const removeIf: <A>(p: Predicate<A>) => (self: TSet<A>) => STM<never, never, Chunk<A>>;
```

### removeIfDiscard

Removes elements matching predicate.

```ts
export declare const removeIfDiscard: <A>(p: Predicate<A>) => (self: TSet<A>) => STM<never, never, void>;
```

### retainIf

retains bindings matching predicate and returns the retaind entries.

```ts
export declare const retainIf: <A>(p: Predicate<A>) => (self: TSet<A>) => STM<never, never, Chunk<A>>;
```

### retainIfDiscard

Retains elements matching predicate.

```ts
export declare const retainIfDiscard: <A>(p: Predicate<A>) => (self: TSet<A>) => STM<never, never, void>;
```

### size

Returns the set's cardinality.

```ts
export declare const size: <A>(self: TSet<A>) => USTM<number>;
```

### takeFirst

Takes the first matching value, or retries until there is one.

```ts
export declare const takeFirst: <A, B>(pf: (a: A) => Maybe<B>) => (self: TSet<A>) => STM<never, never, B>;
```

### takeFirstSTM

Transactionally takes the first matching value, or retries until there is one.

```ts
export declare const takeFirstSTM: <A, R, E, B>(pf: (a: A) => STM<R, Maybe<E>, B>) => (self: TSet<A>) => STM<R, E, B>;
```

### takeSome

Takes all matching values, or retries until there is at least one.

```ts
export declare const takeSome: <A, B>(pf: (a: A) => Maybe<B>) => (self: TSet<A>) => STM<never, never, Chunk<B>>;
```

### takeSomeSTM

Transactionally takes all matching values, or retries until there is at least one.

```ts
export declare const takeSomeSTM: <A, R, E, B>(pf: (a: A) => STM<R, Maybe<E>, B>) => (self: TSet<A>) => STM<R, E, Chunk<B>>;
```

### toHashSet

Collects all elements into a hash set.

```ts
export declare const toHashSet: <A>(self: TSet<A>) => USTM<HashSet<A>>;
```

### toList

Collects all elements into a list.

```ts
export declare const toList: <A>(self: TSet<A>) => USTM<List<A>>;
```

### transform

Atomically updates all elements using a pure function.

```ts
export declare const transform: <A>(f: (a: A) => A) => (self: TSet<A>) => STM<never, never, void>;
```

### transformSTM

Atomically updates all elements using a transactional function.

```ts
export declare const transformSTM: <A, R, E>(f: (a: A) => STM<R, E, A>) => (self: TSet<A>) => STM<R, E, void>;
```

### union

Atomically transforms the set into the union of itself and the provided
set.

```ts
export declare const union: <A>(other: TSet<A>) => (self: TSet<A>) => STM<never, never, void>;
```

