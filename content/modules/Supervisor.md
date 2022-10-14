## Supervisor

Reference Documentation for the module '@effect/core/io/Supervisor'

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

