## TQueue

A `TQueue` is a transactional queue. Offerors can offer values to the queue
and takers can take values from the queue.

```ts
export interface TQueue<A> {
}
```

## General API

### awaitShutdown

Waits for the queue to be shut down.

```ts
export declare const awaitShutdown: <A>(self: TQueue<A>) => USTM<void>;
```

### bounded

Creates a bounded queue with the back pressure strategy. The queue will
retain values until they have been taken, applying back pressure to
offerors if the queue is at capacity.

For best performance use capacities that are powers of two.

```ts
export declare const bounded: <A>(requestedCapacity: number) => USTM<TQueue<A>>;
```

### capacity

The maximum capacity of the queue.

```ts
export declare const capacity: <A>(self: TQueue<A>) => number;
```

### dropping

Creates a bounded queue with the dropping strategy. The queue will drop new
values if the queue is at capacity.

For best performance use capacities that are powers of two.

```ts
export declare const dropping: <A>(requestedCapacity: number) => USTM<TQueue<A>>;
```

### isEmpty

Checks if the queue is empty.

```ts
export declare const isEmpty: <A>(self: TQueue<A>) => USTM<boolean>;
```

### isFull

Checks if the queue is at capacity.

```ts
export declare const isFull: <A>(self: TQueue<A>) => USTM<boolean>;
```

### isShutdown

Checks whether the queue is shut down.

```ts
export declare const isShutdown: <A>(self: TQueue<A>) => USTM<boolean>;
```

### offer

Offers a value to the queue, returning whether the value was offered to the
queue.

```ts
export declare const offer: <A>(value: A) => (self: TQueue<A>) => STM<never, never, boolean>;
```

### offerAll

Offers all of the specified values to the queue, returning whether they
were offered to the queue.

```ts
export declare const offerAll: <A>(as0: Collection<A>) => (self: TQueue<A>) => STM<never, never, boolean>;
```

### peek

Views the next element in the queue without removing it, retrying if the
queue is empty.

```ts
export declare const peek: <A>(self: TQueue<A>) => USTM<A>;
```

### peekMaybe

Views the next element in the queue without removing it, returning `None`
if the queue is empty.

```ts
export declare const peekMaybe: <A>(self: TQueue<A>) => USTM<Maybe<A>>;
```

### poll

Takes a single element from the queue, returning `None` if the queue is
empty.

```ts
export declare const poll: <A>(self: TQueue<A>) => USTM<Maybe<A>>;
```

### seek

Drops elements from the queue while they do not satisfy the predicate,
taking and returning the first element that does satisfy the predicate.
Retries if no elements satisfy the predicate.

```ts
export declare const seek: <A>(f: (a: A) => boolean) => (self: TQueue<A>) => STM<never, never, A>;
```

### shutdown

Shuts down the queue.

```ts
export declare const shutdown: <A>(self: TQueue<A>) => USTM<void>;
```

### size

The current number of values in the queue.

```ts
export declare const size: <A>(self: TQueue<A>) => USTM<number>;
```

### sliding

Creates a bounded queue with the sliding strategy. The queue will add new
values and drop old values if the queue is at capacity.

For best performance use capacities that are powers of two.

```ts
export declare const sliding: <A>(requestedCapacity: number) => USTM<TQueue<A>>;
```

### take

Takes a value from the queue.

```ts
export declare const take: <A>(self: TQueue<A>) => USTM<A>;
```

### takeAll

takeAlls all the values from the queue.

```ts
export declare const takeAll: <A>(self: TQueue<A>) => USTM<Chunk<A>>;
```

### takeBetween

Takes a number of elements from the queue between the specified minimum and
maximum. If there are fewer than the minimum number of elements available,
retries until at least the minimum number of elements have been collected.

```ts
export declare const takeBetween: (min: number, max: number) => <A>(self: TQueue<A>) => STM<never, never, Chunk<A>>;
```

### takeN

Takes the specified number of elements from the queue. If there are fewer
than the specified number of elements available, it retries until they
become available.

```ts
export declare const takeN: (n: number) => <A>(self: TQueue<A>) => STM<never, never, Chunk<A>>;
```

### takeRemainder

```ts
export declare const takeRemainder: <A>(min: number, max: number, acc: Chunk<A>) => (self: TQueue<A>) => STM<never, never, Chunk<A>>;
```

### takeUpTo

Takes up to the specified number of values from the queue.

```ts
export declare const takeUpTo: (max: number) => <A>(self: TQueue<A>) => STM<never, never, Chunk<A>>;
```

### unbounded

Creates an unbounded queue.

```ts
export declare const unbounded: <A>() => USTM<TQueue<A>>;
```

