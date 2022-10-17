## TSemaphore

Reference Documentation for the module '@effect/stm/TSemaphore'

A `TSemaphore` is a semaphore that can be composed transactionally. Because
of the extremely high performance of Effect's implementation of software
transactional memory `TSemaphore` can support both controlling access to some
resource on a standalone basis as well as composing with other STM data
structures to solve more advanced concurrency problems.

For basic use cases, the most idiomatic way to work with a semaphore is to
use the `withPermit` operator, which acquires a permit before executing some
effect and release the permit immediately afterward. The permit is guaranteed
to be released immediately after the effect completes execution, whether by
success, failure, or interruption. Attempting to acquire a permit when a
sufficient number of permits are not available will semantically block until
permits become available without blocking any underlying operating system
threads. If you want to acquire more than one permit at a time you can use
`withPermits`, which allows specifying a number of permits to acquire. You
You can also use `withPermitScoped` or `withPermitsScoped` to acquire and
release permits within the context of a scoped effect for composing with
other resources.

For more advanced concurrency problems you can use the `acquire` and
`release` operators directly, or their variants `acquireN` and `releaseN`,
all of which return STM transactions. Thus, they can be composed to form
larger STM transactions, for example acquiring permits from two different
semaphores transactionally and later releasing them transactionally to safely
synchronize on access to two different mutable variables.

```ts
export interface TSemaphore {
    readonly [TSemaphoreSym]: TSemaphoreSym;
}
```

## General API

### acquire

Acquires a single permit in transactional context.

```ts
export declare const acquire: (self: TSemaphore) => STM<never, never, void>;
```

### acquireN

Acquires the specified number of permits in a transactional context.

```ts
export declare const acquireN: (n: number) => (self: TSemaphore) => STM<never, never, void>;
```

### available

Returns the number of available permits in a transactional context.

```ts
export declare const available: (self: TSemaphore) => STM<never, never, number>;
```

### make

Constructs a new `TSemaphore` with the specified number of permits.

```ts
export declare const make: (permits: number) => STM<never, never, TSemaphore>;
```

### makeCommit

Constructs a new `TSemaphore` with the specified number of permits,
immediately committing the transaction.

```ts
export declare const makeCommit: (permits: number) => Effect<never, never, TSemaphore>;
```

### release

Releases a single permit in a transactional context.

```ts
export declare const release: (self: TSemaphore) => STM<never, never, void>;
```

### releaseN

Releases the specified number of permits in a transactional context

```ts
export declare const releaseN: (n: number) => (self: TSemaphore) => STM<never, never, void>;
```

### unsafeMake

```ts
export declare const unsafeMake: (permits: number) => TSemaphore;
```

### withPermit

Executes the specified effect, acquiring a permit immediately before the
effect begins execution and releasing it immediately after the effect
completes execution, whether by success, failure, or interruption.

```ts
export declare const withPermit: (self: TSemaphore) => <R, E, A>(effect: Effect<R, E, A>) => Effect<R, E, A>;
```

### withPermitScoped

Returns a scoped effect that describes acquiring a permit as the `acquire`
action and releasing it as the `release` action.

```ts
export declare const withPermitScoped: (self: TSemaphore) => Effect<Scope, never, void>;
```

### withPermits

Executes the specified effect, acquiring the specified number of permits
immediately before the effect begins execution and releasing them
immediately after the effect completes execution, whether by success,
failure, or interruption.

```ts
export declare const withPermits: (permits: number) => (self: TSemaphore) => <R, E, A>(effect: Effect<R, E, A>) => Effect<R, E, A>;
```

### withPermitsScoped

Returns a scoped effect that describes acquiring the specified number of
permits and releasing them when the scope is closed.

```ts
export declare const withPermitsScoped: (permits: number) => (self: TSemaphore) => Effect<Scope, never, void>;
```

