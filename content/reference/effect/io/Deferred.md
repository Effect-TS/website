## Deferred

Reference Documentation for the module '@effect/io/Deferred'

A `Deferred` represents an asynchronous variable that can be set exactly
once, with the ability for an arbitrary number of fibers to suspend (by
calling `await`) and automatically resume when the variable is set.

`Deferred` can be used for building primitive actions whose completions
require the coordinated action of multiple fibers, and for building
higher-level concurrent or asynchronous structures.

```ts
export interface Deferred<E, A> extends DeferredInternal<E, A> {
}
```

## Method

### make

Makes a new `Deferred` to be completed by the fiber creating the `Deferred`.

```ts
export declare const make: <E, A>() => Effect<never, never, Deferred<E, A>>;
```

### makeAs

Makes a new `Deferred` to be completed by the fiber with the specified id.

```ts
export declare const makeAs: <E, A>(fiberId: FiberId) => Effect<never, never, Deferred<E, A>>;
```

### unsafeMake

```ts
export declare const unsafeMake: <E, A>(fiberId: FiberId) => Deferred<E, A>;
```

