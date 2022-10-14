## Queue

Reference Documentation for the module '@effect/core/io/Queue'

A `Queue` is a lightweight, asynchronous queue into which values can be
enqueued and of which elements can be dequeued.

```ts
export interface Queue<A> extends Enqueue<A>, Dequeue<A> {
}
```

## Methods

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

