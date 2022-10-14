## FiberScope

Reference Documentation for the module '@effect/core/io/FiberScope'

### globalScope

The global scope. Anything forked onto the global scope is not supervised,
and will only terminate on its own accord (never from interruption of a
parent fiber, because there is no parent fiber).

```ts
/**
 * @tsplus static effect/core/io/FiberScope.Ops global
 */
export declare const globalScope: Global;
```

### make

Unsafely creats a new `Scope` from a `Fiber`.

```ts
/**
 * @tsplus static effect/core/io/FiberScope.Ops make
 */
export declare const make: (fiber: FiberRuntime<any, any>) => FiberScope;
```

