## Deferred

Reference Documentation for the module '@effect/core/io/Deferred'

### make

Makes a new `Deferred` to be completed by the fiber creating the `Deferred`.

```ts
/**
 * @tsplus static effect/core/io/Deferred.Ops make
 */
export declare const make: <E, A>() => Effect<never, never, Deferred<E, A>>;
```

### makeAs

Makes a new `Deferred` to be completed by the fiber with the specified id.

```ts
/**
 * @tsplus static effect/core/io/Deferred.Ops makeAs
 */
export declare const makeAs: <E, A>(fiberId: FiberId) => Effect<never, never, Deferred<E, A>>;
```

### unsafeMake

```ts
export declare const unsafeMake: <E, A>(fiberId: FiberId) => Deferred<E, A>;
```

