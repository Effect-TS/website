## Queue

Reference Documentation for the module '@effect/io/Queue'

A `Queue` is a lightweight, asynchronous queue into which values can be
enqueued and of which elements can be dequeued.

```ts
export interface Queue<A> extends Enqueue<A>, Dequeue<A> {
}
```

```ts
export interface Enqueue<A> extends CommonQueue {
    /**
     * Internal Variance Marker
     */
    get [_In](): (_: A) => unknown;
    /**
     * Places one value in the queue.
     */
    offer(this: this, a: A): Effect<never, never, boolean>;
    /**
     * For Bounded Queue: uses the `BackPressure` Strategy, places the values in
     * the queue and always returns true. If the queue has reached capacity, then
     * the fiber performing the `offerAll` will be suspended until there is room
     * in the queue.
     *
     * For Unbounded Queue: Places all values in the queue and returns true.
     *
     * For Sliding Queue: uses `Sliding` Strategy If there is room in the queue,
     * it places the values otherwise it removes the old elements and enqueues the
     * new ones. Always returns true.
     *
     * For Dropping Queue: uses `Dropping` Strategy, It places the values in the
     * queue but if there is no room it will not enqueue them and return false.
     */
    offerAll(this: this, as: Collection<A>): Effect<never, never, boolean>;
}
```

```ts
export interface Dequeue<A> extends CommonQueue {
    /**
     * Internal Variance Marker
     */
    get [_Out](): (_: never) => A;
    /**
     * Removes the oldest value in the queue. If the queue is empty, this will
     * return a computation that resumes when an item has been added to the queue.
     */
    get take(): Effect<never, never, A>;
    /**
     * Removes all the values in the queue and returns the values. If the queue is
     * empty returns an empty collection.
     */
    get takeAll(): Effect<never, never, Chunk<A>>;
    /**
     * Takes up to max number of values from the queue.
     */
    takeUpTo(this: this, max: number): Effect<never, never, Chunk<A>>;
    /**
     * Takes a number of elements from the queue between the specified minimum and
     * maximum. If there are fewer than the minimum number of elements available,
     * suspends until at least the minimum number of elements have been collected.
     */
    takeBetween(this: this, min: number, max: number): Effect<never, never, Chunk<A>>;
    /**
     * Takes the specified number of elements from the queue. If there are fewer
     * than the specified number of elements available, it suspends until they
     * become available.
     */
    takeN(this: this, n: number): Effect<never, never, Chunk<A>>;
    /**
     * Take the head option of values in the queue.
     */
    get poll(): Effect<never, never, Maybe<A>>;
}
```

## Method

### bounded

Makes a new bounded queue. When the capacity of the queue is reached, any
additional calls to `offer` will be suspended until there is more room in
the queue.

**Note**: When possible use only power of 2 capacities; this will provide
better performance by utilising an optimised version of the underlying
`RingBuffer`.

```ts
export declare const bounded: <A>(requestedCapacity: number) => Effect<never, never, Queue<A>>;
```

### create

Creates a new `Queue` using the provided `Strategy`.

```ts
export declare const create: <A>(queue: MutableQueue<A>, strategy: Strategy<A>) => Effect<never, never, Queue<A>>;
```

### dropping

Makes a new bounded queue with the dropping strategy. When the capacity of
the queue is reached, new elements will be dropped.

**Note**: When possible use only power of 2 capacities; this will provide
better performance by utilising an optimised version of the underlying
`RingBuffer`.

```ts
export declare const dropping: <A>(requestedCapacity: number) => Effect<never, never, Queue<A>>;
```

### sliding

Makes a new bounded queue with sliding strategy. When the capacity of the
queue is reached, new elements will be added and the old elements will be
dropped.

**Note**: When possible use only power of 2 capacities; this will provide
better performance by utilising an optimised version of the underlying
`RingBuffer`.

```ts
export declare const sliding: <A>(requestedCapacity: number) => Effect<never, never, Queue<A>>;
```

### unbounded

Makes a new unbounded queue.

```ts
export declare const unbounded: <A>() => Effect<never, never, Queue<A>>;
```

