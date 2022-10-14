## Ref

Reference Documentation for the module '@effect/core/io/Ref'

### makeRef

Creates a new `Ref` with the specified value.

```ts
/**
 * @tsplus static effect/core/io/Ref.Ops make
 * @tsplus location "@effect/core/io/Ref/operations/make"
 */
export declare const makeRef: <A>(value: LazyArg<A>) => Effect<never, never, Ref<A>>;
```

### makeSynchronized

Creates a new `Ref.Synchronized` with the specified value.

```ts
/**
 * @tsplus static effect/core/io/Ref/Synchronized.Ops make
 * @tsplus static effect/core/io/Ref/Synchronized.Ops __call
 * @tsplus location "@effect/core/io/Ref/operations/make"
 */
export declare const makeSynchronized: <A>(value: LazyArg<A>) => Effect<never, never, Synchronized<A>>;
```

### unsafeMake

```ts
/**
 * @tsplus static effect/core/io/Ref.Ops unsafeMake
 * @tsplus location "@effect/core/io/Ref/operations/unsafeMake"
 */
export declare const unsafeMake: <A>(value: A) => Atomic<A>;
```

### unsafeMakeSynchronized

```ts
/**
 * @tsplus static effect/core/io/Ref/Synchronized.Ops unsafeMake
 * @tsplus location "@effect/core/io/Ref/operations/unsafeMake"
 */
export declare const unsafeMakeSynchronized: <A>(initial: A) => Synchronized<A>;
```

