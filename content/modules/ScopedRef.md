## ScopedRef

Reference Documentation for the module '@effect/core/io/ScopedRef'

### fromAcquire

Creates a new `ScopedRef` from an effect that resourcefully produces a
value.

```ts
/**
 * @tsplus static effect/core/io/ScopedRef.Ops fromAcquire
 */
export declare const fromAcquire: <R, E, A>(acquire: Effect<R, E, A>) => Effect<Scope | R, E, ScopedRef<A>>;
```

### make

Creates a new `ScopedRef` from the specified value. This method should
not be used for values whose creation require the acquisition of resources.

```ts
/**
 * @tsplus static effect/core/io/ScopedRef.Ops make
 */
export declare const make: <A>(value: LazyArg<A>) => Effect<Scope, never, ScopedRef<A>>;
```

