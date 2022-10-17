## TReentrantLock

A `TReentrantLock` is a reentrant read/write lock. Multiple readers may all
concurrently acquire read locks. Only one writer is allowed to acquire a
write lock at any given time. Read locks may be upgraded into write locks. A
fiber that has a write lock may acquire other write locks or read locks.

The two primary methods of this structure are `readLock`, which acquires a
read lock in a scoped context, and `writeLock`, which acquires a write lock
in a scoped context.

Although located in the STM package, there is no need for locks within STM
transactions. However, this lock can be quite useful in effectful code, to
provide consistent read/write access to mutable state; and being in STM
allows this structure to be composed into more complicated concurrent
structures that are consumed from effectful code.

```ts
export interface TReentrantLock {
}
```

## General API

### acquireRead

Acquires a read lock. The transaction will suspend until no other fiber is
holding a write lock. Succeeds with the number of read locks held by this
fiber.

```ts
export declare const acquireRead: (self: TReentrantLock) => USTM<number>;
```

### acquireWrite

Acquires a write lock. The transaction will suspend until no other fibers
are holding read or write locks. Succeeds with the number of write locks
held by this fiber.

```ts
export declare const acquireWrite: (self: TReentrantLock) => USTM<number>;
```

### adjustRead

```ts
export declare const adjustRead: (delta: number) => (self: TReentrantLock) => STM<never, never, number>;
```

### fiberReadLocks

Retrieves the number of acquired read locks for this fiber.

```ts
export declare const fiberReadLocks: (self: TReentrantLock) => USTM<number>;
```

### fiberWriteLocks

Retrieves the number of acquired write locks for this fiber.

```ts
export declare const fiberWriteLocks: (self: TReentrantLock) => USTM<number>;
```

### lock

Just a convenience method for applications that only need reentrant locks,
without needing a distinction between readers / writers.

See `TReentrantLock.writeLock`.

```ts
export declare const lock: (self: TReentrantLock) => Effect<Scope, never, number>;
```

### locked

Determines if any fiber has a read or write lock.

```ts
export declare const locked: (self: TReentrantLock) => USTM<boolean>;
```

### make

Makes a new reentrant read/write lock.

```ts
export declare const make: () => USTM<TReentrantLock>;
```

### makeCommit

```ts
export declare const makeCommit: () => Effect<never, never, TReentrantLock>;
```

### readLock

Obtains a read lock in a scoped context.

```ts
export declare const readLock: (self: TReentrantLock) => Effect<Scope, never, number>;
```

### readLocked

Determines if any fiber has a read lock.

```ts
export declare const readLocked: (self: TReentrantLock) => USTM<boolean>;
```

### readLocks

Retrieves the total number of acquired read locks.

```ts
export declare const readLocks: (self: TReentrantLock) => USTM<number>;
```

### releaseRead

Releases a read lock held by this fiber. Succeeds with the outstanding
number of read locks held by this fiber.

```ts
export declare const releaseRead: (self: TReentrantLock) => USTM<number>;
```

### releaseWrite

Releases a write lock held by this fiber. Succeeds with the outstanding
number of write locks held by this fiber.

```ts
export declare const releaseWrite: (self: TReentrantLock) => USTM<number>;
```

### withLock

Runs the specified workflow with a lock.

```ts
export declare const withLock: <R, E, A>(effect: Effect<R, E, A>) => (self: TReentrantLock) => Effect<R, E, A>;
```

### withLockScoped

Runs the specified workflow with a lock.

```ts
export declare const withLockScoped: (self: TReentrantLock) => Effect<Scope, never, number>;
```

### withReadLock

Runs the specified workflow with a read lock.

```ts
export declare const withReadLock: <R, E, A>(effect: Effect<R, E, A>) => (self: TReentrantLock) => Effect<R, E, A>;
```

### withWriteLock

Runs the specified workflow with a write lock.

```ts
export declare const withWriteLock: <R, E, A>(effect: Effect<R, E, A>) => (self: TReentrantLock) => Effect<R, E, A>;
```

### writeLock

Obtains a write lock in a scoped context.

```ts
export declare const writeLock: (self: TReentrantLock) => Effect<Scope, never, number>;
```

### writeLocked

Determines if a write lock is held by some fiber.

```ts
export declare const writeLocked: (self: TReentrantLock) => USTM<boolean>;
```

### writeLocks

Computes the number of write locks held by fibers.

```ts
export declare const writeLocks: (self: TReentrantLock) => USTM<number>;
```

