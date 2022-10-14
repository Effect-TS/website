## Enqueue

Reference Documentation for the module Enqueue in '@effect/core/io/Queue'

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

