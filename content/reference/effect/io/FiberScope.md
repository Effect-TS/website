## FiberScope

Reference Documentation for the module '@effect/io/FiberScope'

A `FiberScope` represents the scope of a fiber lifetime. The scope of a
fiber can be retrieved using `Effect.descriptor`, and when forking fibers,
you can specify a custom scope to fork them on by using the `forkIn`.

```ts
export type FiberScope = Global | Local;
```

## Methods

### globalScope

The global scope. Anything forked onto the global scope is not supervised,
and will only terminate on its own accord (never from interruption of a
parent fiber, because there is no parent fiber).

```ts
export declare const globalScope: Global;
```

### make

Unsafely creats a new `Scope` from a `Fiber`.

```ts
export declare const make: (fiber: FiberRuntime<any, any>) => FiberScope;
```

