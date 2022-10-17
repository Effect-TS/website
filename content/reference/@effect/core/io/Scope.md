## Scope

A `Scope` is the foundation of safe, composable resource management in ZIO. A
scope has two fundamental operators, `addFinalizer`, which adds a finalizer
to the scope, and `close`, which closes a scope and runs all finalizers that
have been added to the scope.

```ts
export interface Scope {
    readonly [ScopeSym]: ScopeSym;
}
```

## General API

### addFinalizer

Adds a finalizer to this scope. The finalizer is guaranteed to be run when
the scope is closed.

```ts
export declare const addFinalizer: (finalizer: Effect<never, never, unknown>) => (self: Scope) => Effect<never, never, void>;
```

### addFinalizerExit

A simplified version of `addFinalizerWith` when the `finalizer` does not
depend on the `Exit` value that the scope is closed with.

```ts
export declare const addFinalizerExit: (finalizer: Finalizer) => (self: Scope) => Effect<never, never, void>;
```

### close

Closes a scope with the specified exit value, running all finalizers that
have been added to the scope.

```ts
export declare const close: (exit: Exit<unknown, unknown>) => (self: CloseableScope) => Effect<never, never, void>;
```

### extend

Extends the scope of an `Effect` workflow that needs a scope into this
scope by providing it to the workflow but not closing the scope when the
workflow completes execution. This allows extending a scoped value into a
larger scope.

```ts
export declare const extend: <R, E, A>(effect: Effect<R, E, A>) => (self: Scope) => Effect<Exclude<R, Scope>, E, A>;
```

### fork

Forks a new scope that is a child of this scope. The child scope will
automatically be closed when this scope is closed.

```ts
export declare const fork: (self: Scope) => Effect<never, never, CloseableScope>;
```

### global

The global scope which is never closed. Finalizers added to this scope will
be immediately discarded and closing this scope has no effect.

```ts
export declare const global: CloseableScope;
```

### make

Makes a scope. Finalizers added to this scope will be run sequentially in
the reverse of the order in which they were added when this scope is
closed.

```ts
export declare const make: Effect<never, never, CloseableScope>;
```

### makeWith

Makes a scope. Finalizers added to this scope will be run according to the
specified `ExecutionStrategy`.

```ts
export declare const makeWith: (executionStrategy: ExecutionStrategy) => Effect<never, never, CloseableScope>;
```

### parallel

Makes a scope. Finalizers added to this scope will be run in parallel when
this scope is closed.

```ts
export declare const parallel: () => Effect<never, never, CloseableScope>;
```

### use

Uses the scope by providing it to an `Effect` workflow that needs a scope,
guaranteeing that the scope is closed with the result of that workflow as
soon as the workflow completes execution, whether by success, failure, or
interruption.

```ts
export declare const use: <R, E, A>(effect: Effect<R, E, A>) => (self: CloseableScope) => Effect<Exclude<R, Scope>, E, A>;
```

