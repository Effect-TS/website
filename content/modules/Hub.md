## Hub

Reference Documentation for the module '@effect/core/io/Hub'

### backPressureStrategy

```ts
/**
 * @tsplus static effect/core/io/Hub/Strategy.Ops BackPressure
 */
export declare const backPressureStrategy: <A>() => Strategy<A>;
```

### bounded

Creates a bounded hub with the back pressure strategy. The hub will retain
messages until they have been taken by all subscribers, applying back
pressure to publishers if the hub is at capacity.

For best performance use capacities that are powers of two.

```ts
/**
 * @tsplus static effect/core/io/Hub.Ops bounded
 */
export declare const bounded: <A>(requestedCapacity: number) => Effect<never, never, Hub<A>>;
```

### dropping

Creates a bounded hub with the dropping strategy. The hub will drop new
messages if the hub is at capacity.

For best performance use capacities that are powers of two.

```ts
/**
 * @tsplus static effect/core/io/Hub.Ops dropping
 */
export declare const dropping: <A>(requestedCapacity: number) => Effect<never, never, Hub<A>>;
```

### droppingStrategy

```ts
/**
 * @tsplus static effect/core/io/Hub/Strategy.Ops Dropping
 */
export declare const droppingStrategy: <A>() => Strategy<A>;
```

### sliding

Creates a bounded hub with the sliding strategy. The hub will add new
messages and drop old messages if the hub is at capacity.

For best performance use capacities that are powers of two.

```ts
/**
 * @tsplus static effect/core/io/Hub.Ops sliding
 */
export declare const sliding: <A>(requestedCapacity: number) => Effect<never, never, Hub<A>>;
```

### slidingStrategy

```ts
/**
 * @tsplus static effect/core/io/Hub/Strategy.Ops Sliding
 */
export declare const slidingStrategy: <A>() => Strategy<A>;
```

### unbounded

Creates an unbounded hub.

```ts
/**
 * @tsplus static effect/core/io/Hub.Ops unbounded
 */
export declare const unbounded: <A>() => Effect<never, never, Hub<A>>;
```

