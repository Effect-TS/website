## Dequeue

Reference Documentation for the module Dequeue in '@effect/core/io/Queue'

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

