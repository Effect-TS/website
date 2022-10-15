## TMap

Reference Documentation for the module '@effect/stm/TMap'

Transactional map implemented on top of TRef and TArray. Resolves
conflicts via chaining.

```ts
export interface TMap<K, V> {
    readonly [TMapSym]: TMapSym;
    readonly [_K]: () => K;
    readonly [_V]: () => V;
}
```

## General API

### contains

Tests whether or not map contains a key.

```ts
export declare const contains: <K>(k: K) => <V>(self: TMap<K, V>) => STM<never, never, boolean>;
```

### delete

```ts
export declare const delete: <K>(k: K) => <V>(self: TMap<K, V>) => STM<never, never, void>;
```

### deleteAll

Deletes all entries associated with the specified keys.

```ts
export declare const deleteAll: <K>(ks: Collection<K>) => <V>(self: TMap<K, V>) => STM<never, never, void>;
```

### empty

Makes an empty `TMap`.

```ts
export declare const empty: <K, V>() => USTM<TMap<K, V>>;
```

### find

Finds the key/value pair matching the specified predicate, and uses the
provided function to extract a value out of it.

```ts
export declare const find: <K, V, A>(pf: (kv: readonly [K, V]) => Maybe<A>) => (self: TMap<K, V>) => STM<never, never, Maybe<A>>;
```

### findAll

Finds all the key/value pairs matching the specified predicate, and uses
the provided function to extract values out them.

```ts
export declare const findAll: <K, V, A>(pf: (kv: readonly [K, V]) => Maybe<A>) => (self: TMap<K, V>) => STM<never, never, Chunk<A>>;
```

### findAllSTM

Finds all the key/value pairs matching the specified predicate, and uses
the provided effectful function to extract values out of them..

```ts
export declare const findAllSTM: <K, V, R, E, A>(pf: (kv: readonly [K, V]) => STM<R, Maybe<E>, A>) => (self: TMap<K, V>) => STM<R, E, Chunk<A>>;
```

### findSTM

Finds the key/value pair matching the specified predicate, and uses the
provided effectful function to extract a value out of it.

```ts
export declare const findSTM: <K, V, R, E, A>(f: (kv: readonly [K, V]) => STM<R, Maybe<E>, A>) => (self: TMap<K, V>) => STM<R, E, Maybe<A>>;
```

### fold

Atomically folds using a pure function.

```ts
export declare const fold: <K, V, A>(zero: A, op: (acc: A, kv: readonly [K, V]) => A) => (self: TMap<K, V>) => STM<never, never, A>;
```

### foldSTM

Atomically folds using a transactional function.

```ts
export declare const foldSTM: <K, V, R, E, A>(zero: A, op: (a: A, kv: readonly [K, V]) => STM<R, E, A>) => (self: TMap<K, V>) => STM<R, E, A>;
```

### forEach

Atomically performs transactional-effect for each binding present in map.

```ts
export declare const forEach: <K, V, R, E>(f: (kv: readonly [K, V]) => STM<R, E, void>) => (self: TMap<K, V>) => STM<R, E, void>;
```

### fromIterable

Makes a new `TMap` initialized with provided iterable.

```ts
export declare const fromIterable: <K, V>(data0: Collection<readonly [K, V]>) => USTM<TMap<K, V>>;
```

### get

Retrieves value associated with given key.

```ts
export declare const get: <K>(k: K) => <V>(self: TMap<K, V>) => STM<never, never, Maybe<V>>;
```

### getOrElse

Retrieves value associated with given key or default value, in case the key
isn't present.

```ts
export declare const getOrElse: <K, V>(k: K, onNone: LazyArg<V>) => (self: TMap<K, V>) => STM<never, never, V>;
```

### isEmpty

Tests if the map is empty or not

```ts
export declare const isEmpty: <K, V>(self: TMap<K, V>) => USTM<boolean>;
```

### keys

Collects all keys stored in map.

```ts
export declare const keys: <K, V>(self: TMap<K, V>) => USTM<List<K>>;
```

### make

Makes a new `TMap` that is initialized with specified values.

```ts
export declare const make: <K, V>(...data: (readonly [K, V])[]) => USTM<TMap<K, V>>;
```

### merge_

If the key `k` is not already associated with a value, stores the provided
value, otherwise merge the existing value with the new one using function
`f` and store the result

```ts
export declare const merge_: <K, V>(k: K, v: V, f: (values: readonly [V, V]) => V) => (self: TMap<K, V>) => STM<never, never, V>;
```

### put

Stores new binding into the map.

```ts
export declare const put: <K, V>(k: K, v: V) => (self: TMap<K, V>) => STM<never, never, void>;
```

### putIfAbsent

Stores new binding in the map if it does not already exist.

```ts
export declare const putIfAbsent: <K, V>(k: K, v: V) => (self: TMap<K, V>) => STM<never, never, void>;
```

### removeIf

Removes bindings matching predicate and returns the removed entries.

```ts
export declare const removeIf: <K, V>(f: (kv: readonly [K, V]) => boolean) => (self: TMap<K, V>) => STM<never, never, Chunk<readonly [K, V]>>;
```

### removeIfDiscard

Removes bindings matching predicate.

```ts
export declare const removeIfDiscard: <K, V>(f: (kv: readonly [K, V]) => boolean) => (self: TMap<K, V>) => STM<never, never, void>;
```

### retainIf

Retains bindings matching predicate and returns removed bindings.

```ts
export declare const retainIf: <K, V>(f: (kv: readonly [K, V]) => boolean) => (self: TMap<K, V>) => STM<never, never, Chunk<readonly [K, V]>>;
```

### retainIfDiscard

Retains bindings matching predicate.

```ts
export declare const retainIfDiscard: <K, V>(f: (kv: readonly [K, V]) => boolean) => (self: TMap<K, V>) => STM<never, never, void>;
```

### size

Returns the number of bindings.

```ts
export declare const size: <K, V>(self: TMap<K, V>) => USTM<number>;
```

### takeFirst

Takes the first matching value, or retries until there is one.

```ts
export declare const takeFirst: <K, V, A>(pf: (kv: readonly [K, V]) => Maybe<A>) => (self: TMap<K, V>) => STM<never, never, A>;
```

### takeFirstSTM

```ts
export declare const takeFirstSTM: <K, V, R, E, A>(pf: (kv: readonly [K, V]) => STM<R, Maybe<E>, A>) => (self: TMap<K, V>) => STM<R, E, A>;
```

### takeSome

Takes all matching values, or retries until there is at least one.

```ts
export declare const takeSome: <K, V, A>(pf: (kv: readonly [K, V]) => Maybe<A>) => (self: TMap<K, V>) => STM<never, never, Chunk<A>>;
```

### takeSomeSTM

Takes all matching values, or retries until there is at least one.

```ts
export declare const takeSomeSTM: <K, V, R, E, A>(pf: (kv: readonly [K, V]) => STM<R, Maybe<E>, A>) => (self: TMap<K, V>) => STM<R, E, Chunk<A>>;
```

### toChunk

Collects all bindings into a chunk.

```ts
export declare const toChunk: <K, V>(self: TMap<K, V>) => USTM<Chunk<readonly [K, V]>>;
```

### toList

Collects all bindings into a list.

```ts
export declare const toList: <K, V>(self: TMap<K, V>) => USTM<List<readonly [K, V]>>;
```

### toMap

Collects all bindings into a map.

```ts
export declare const toMap: <K, V>(self: TMap<K, V>) => USTM<Map<K, V>>;
```

### transform

Atomically updates all bindings using a pure function.

```ts
export declare const transform: <K, V>(f: (kv: readonly [K, V]) => readonly [K, V]) => (self: TMap<K, V>) => STM<never, never, void>;
```

### transformSTM

Atomically updates all bindings using a transactional function.

```ts
export declare const transformSTM: <K, V, R, E>(f: (kv: readonly [K, V]) => STM<R, E, readonly [K, V]>) => (self: TMap<K, V>) => STM<R, E, void>;
```

### transformValues

Atomically updates all values using a pure function.

```ts
export declare const transformValues: <V>(f: (v: V) => V) => <K>(self: TMap<K, V>) => STM<never, never, void>;
```

### transformValuesSTM

Atomically updates all values using a transactional function.

```ts
export declare const transformValuesSTM: <V, R, E>(f: (v: V) => STM<R, E, V>) => <K>(self: TMap<K, V>) => STM<R, E, void>;
```

### updateWith

Updates the mapping for the specified key with the specified function,
which takes the current value of the key as an input, if it exists, and
either returns `Some` with a new value to indicate to update the value in
the map or `None` to remove the value from the map. Returns `Some` with the
updated value or `None` if the value was removed from the map.

```ts
export declare const updateWith: <K, V>(k: K, f: (v: Maybe<V>) => Maybe<V>) => (self: TMap<K, V>) => STM<never, never, Maybe<V>>;
```

### values

Collects all values stored in map.

```ts
export declare const values: <K, V>(self: TMap<K, V>) => USTM<List<V>>;
```

