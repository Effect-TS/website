## Ref

Reference Documentation for the module '@effect/core/io/Ref'

### makeRef

Creates a new `Ref` with the specified value.

```ts
export declare const makeRef: <A>(value: LazyArg<A>) => Effect<never, never, Ref<A>>;
```

### makeSynchronized

Creates a new `Ref.Synchronized` with the specified value.

```ts
export declare const makeSynchronized: <A>(value: LazyArg<A>) => Effect<never, never, Synchronized<A>>;
```

### unsafeMake

```ts
export declare const unsafeMake: <A>(value: A) => Atomic<A>;
```

### unsafeMakeSynchronized

```ts
export declare const unsafeMakeSynchronized: <A>(initial: A) => Synchronized<A>;
```

