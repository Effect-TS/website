## Supervisor

Reference Documentation for the module '@effect/core/io/Supervisor'

A `Supervisor<A>` is allowed to supervise the launching and termination of
fibers, producing some visible value of type `A` from the supervision.

```ts
export declare abstract class Supervisor<T> {
    readonly [SupervisorURI]: {
        _T: (_: never) => T;
    };
    /**
     * Returns an effect that succeeds with the value produced by this supervisor.
     * This value may change over time, reflecting what the supervisor produces as
     * it supervises fibers.
     */
    abstract get value(): Effect<never, never, T>;
    abstract onStart<R, E, A>(environment: Env<R>, effect: Effect<R, E, A>, parent: Maybe<FiberRuntime<any, any>>, fiber: FiberRuntime<E, A>): void;
    abstract onEnd<E, A>(value: Exit<E, A>, fiber: FiberRuntime<E, A>): void;
    abstract onEffect<E, A>(fiber: FiberRuntime<E, A>, effect: Effect<any, any, any>): void;
    abstract onSuspend<E, A>(fiber: FiberRuntime<E, A>): void;
    abstract onResume<E, A>(fiber: FiberRuntime<E, A>): void;
    /**
     * Maps this supervisor to another one, which has the same effect, but whose
     * value has been transformed by the specified function.
     */
    map<B>(f: (a: T) => B): Supervisor<B>;
    /**
     * Returns a new supervisor that performs the function of this supervisor, and
     * the function of the specified supervisor, producing a tuple of the outputs
     * produced by both supervisors.
     */
    zip<B>(right: Supervisor<B>): Supervisor<readonly [T, B]>;
}
```

## Methods

### applyPatch

Applies an update to the supervisor to produce a new supervisor.

```ts
/**
 * @tsplus static effect/core/io/Supervisor.Ops applyPatch
 */
export declare const applyPatch: (self: Patch, supervisor: Supervisor<any>) => Supervisor<any>;
```

### combinePatch

Combines two patches to produce a new patch that describes applying the
updates from this patch and then the updates from the specified patch.

```ts
/**
 * @tsplus static effect/core/io/Supervisor.Ops combinePatch
 */
export declare const combinePatch: (self: Patch, that: Patch) => Patch;
```

### diff

```ts
/**
 * @tsplus static effect/core/io/Supervisor.Ops diff
 */
export declare const diff: (oldValue: Supervisor<any>, newValue: Supervisor<any>) => Patch;
```

### differ

```ts
/**
 * @tsplus static effect/core/io/Supervisor.Ops differ
 */
export declare const differ: Differ<Supervisor<any>, Patch>;
```

### emptyPatch

An empty patch

```ts
/**
 * @tsplus static effect/core/io/Supervisor.Ops emptyPatch
 */
export declare const emptyPatch: Patch;
```

### fibersIn

Creates a new supervisor that tracks children in a set.

```ts
/**
 * @tsplus static effect/core/io/Supervisor.Ops fibersIn
 */
export declare const fibersIn: (ref: AtomicReference<SortedSet<FiberRuntime<any, any>>>) => Effect<never, never, Supervisor<SortedSet<FiberRuntime<any, any>>>>;
```

### fromEffect

Creates a new supervisor that constantly yields effect when polled

```ts
/**
 * @tsplus static effect/core/io/Supervisor.Ops fromEffect
 */
export declare const fromEffect: <A>(effect: Effect<never, never, A>) => Supervisor<A>;
```

### none

A supervisor that doesn't do anything in response to supervision events.

```ts
/**
 * @tsplus static effect/core/io/Supervisor.Ops none
 */
export declare const none: Supervisor<void>;
```

### track

Creates a new supervisor that tracks children in a set.

```ts
/**
 * @tsplus static effect/core/io/Supervisor.Ops track
 */
export declare const track: Effect<never, never, Supervisor<Chunk<FiberRuntime<any, any>>>>;
```

### unsafeTrack

Creates a new supervisor that tracks children in a set.

```ts
/**
 * @tsplus static effect/core/io/Supervisor.Ops unsafeTrack
 */
export declare const unsafeTrack: () => Supervisor<Chunk<FiberRuntime<any, any>>>;
```

