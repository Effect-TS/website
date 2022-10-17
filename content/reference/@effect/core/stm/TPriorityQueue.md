## TPriorityQueue

A `TPriorityQueue` contains values of type `A` that an `Ordering` is defined
on. Unlike a `TQueue`, `take` returns the highest priority value (the value
that is first in the specified ordering) as opposed to the first value
offered to the queue. The ordering that elements with the same priority will
be taken from the queue is not guaranteed.

```ts
export interface TPriorityQueue<A> {
    readonly [TPriorityQueueSym]: TPriorityQueueSym;
    readonly [_A]: () => A;
}
```

## General API

### empty

Constructs a new empty `TPriorityQueue` with the specified `Ordering`.

```ts
export declare const empty: <A>(ord: Ord<A>) => STM<never, never, TPriorityQueue<A>>;
```

### from

Makes a new `TPriorityQueue` initialized with provided `Collection`.

```ts
export declare const from: <A>(ord: Ord<A>) => (data: Collection<A>) => STM<never, never, TPriorityQueue<A>>;
```

### isEmpty

Checks whether the queue is empty.

```ts
export declare const isEmpty: <A>(self: TPriorityQueue<A>) => USTM<boolean>;
```

### isNonEmpty

Checks whether the queue is not empty.

```ts
export declare const isNonEmpty: <A>(self: TPriorityQueue<A>) => USTM<boolean>;
```

### make

Makes a new `TPriorityQueue` that is initialized with specified values.

```ts
export declare const make: <A>(ord: Ord<A>) => (...data: A[]) => STM<never, never, TPriorityQueue<A>>;
```

### offer

Offers the specified value to the queue.

```ts
export declare const offer: <A>(value: A) => (self: TPriorityQueue<A>) => STM<never, never, void>;
```

### offerAll

Offers all of the elements in the specified collection to the queue.

```ts
export declare const offerAll: <A>(values: Collection<A>) => (self: TPriorityQueue<A>) => STM<never, never, void>;
```

### peek

Peeks at the first value in the queue without removing it, retrying until a
value is in the queue.

```ts
export declare const peek: <A>(self: TPriorityQueue<A>) => USTM<A>;
```

### peekMaybe

Peeks at the first value in the queue without removing it, returning `None`
if there is not a value in the queue.

```ts
export declare const peekMaybe: <A>(self: TPriorityQueue<A>) => USTM<Maybe<A>>;
```

### removeIf

Removes all elements from the queue matching the specified predicate.

```ts
export declare const removeIf: <A>(f: Predicate<A>) => (self: TPriorityQueue<A>) => STM<never, never, void>;
```

### retainIf

Retains only elements from the queue matching the specified predicate.

```ts
export declare const retainIf: <A>(f: Predicate<A>) => (self: TPriorityQueue<A>) => STM<never, never, void>;
```

### size

Returns the size of the queue.

```ts
export declare const size: <A>(self: TPriorityQueue<A>) => USTM<number>;
```

### take

Takes a value from the queue, retrying until a value is in the queue.

```ts
export declare const take: <A>(self: TPriorityQueue<A>) => USTM<A>;
```

### takeAll

Takes all values from the queue.

```ts
export declare const takeAll: <A>(self: TPriorityQueue<A>) => USTM<Chunk<A>>;
```

### takeMaybe

Takes a value from the queue, returning `None` if there is not a value in
the queue.

```ts
export declare const takeMaybe: <A>(self: TPriorityQueue<A>) => USTM<Maybe<A>>;
```

### takeUpTo

Takes up to the specified maximum number of elements from the queue.

```ts
export declare const takeUpTo: (n: number) => <A>(self: TPriorityQueue<A>) => STM<never, never, Chunk<A>>;
```

### toArray

Collects all values into an array.

```ts
export declare const toArray: <A>(self: TPriorityQueue<A>) => USTM<ImmutableArray<A>>;
```

### toChunk

Collects all values into a chunk.

```ts
export declare const toChunk: <A>(self: TPriorityQueue<A>) => USTM<Chunk<A>>;
```

### toList

Collects all values into a List.

```ts
export declare const toList: <A>(self: TPriorityQueue<A>) => USTM<List<A>>;
```

