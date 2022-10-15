## THub

Reference Documentation for the module '@effect/stm/THub'

A `THub` is a transactional message hub. Publishers can publish messages to
the hub and subscribers can subscribe to take messages from the hub.

```ts
export interface THub<A> {
}
```

## General API

### awaitShutdown

```ts
export declare const awaitShutdown: <A>(self: THub<A>) => USTM<void>;
```

### bounded

Creates a bounded hub with the back pressure strategy. The hub will retain
messages until they have been taken by all subscribers, applying back
pressure to publishers if the hub is at capacity.

```ts
export declare const bounded: <A>(requestedCapacity: number) => USTM<THub<A>>;
```

### capacity

The maximum capacity of the hub.

```ts
export declare const capacity: <A>(self: THub<A>) => number;
```

### dropping

Creates a bounded hub with the dropping strategy. The hub will drop new
messages if the hub is at capacity.

```ts
export declare const dropping: <A>(requestedCapacity: number) => USTM<THub<A>>;
```

### isEmpty

Checks if the hub is empty.

```ts
export declare const isEmpty: <A>(self: THub<A>) => USTM<boolean>;
```

### isFull

Checks if the hub is at capacity.

```ts
export declare const isFull: <A>(self: THub<A>) => USTM<boolean>;
```

### isShutdown

Checks whether the hub is shut down.

```ts
export declare const isShutdown: <A>(self: THub<A>) => USTM<boolean>;
```

### make

Creates a hub with the specified strategy.

```ts
export declare const make: <A>(requestedCapacity: number, strategy: Strategy) => USTM<THub<A>>;
```

### offer

```ts
export declare const offer: <A>(value: A) => (self: THub<A>) => STM<never, never, boolean>;
```

### offerAll

```ts
export declare const offerAll: <A>(as: Collection<A>) => (self: THub<A>) => STM<never, never, boolean>;
```

### publish

Publishes a message to the hub, returning whether the message was published
to the hub.

```ts
export declare const publish: <A>(value: A) => (self: THub<A>) => STM<never, never, boolean>;
```

### publishAll

Publishes all of the specified messages to the hub, returning whether they
were published to the hub.

```ts
export declare const publishAll: <A>(as: Collection<A>) => (self: THub<A>) => STM<never, never, boolean>;
```

### shutdown

Shuts down the hub.

```ts
export declare const shutdown: <A>(self: THub<A>) => USTM<void>;
```

### size

The current number of values in the hub.

```ts
export declare const size: <A>(self: THub<A>) => USTM<number>;
```

### sliding

Creates a bounded hub with the sliding strategy. The hub will add new
messages and drop old messages if the hub is at capacity.

For best performance use capacities that are powers of two.

```ts
export declare const sliding: <A>(requestedCapacity: number) => STM<never, never, THub<A>>;
```

### subscribe

Subscribes to receive messages from the hub. The resulting subscription can
be evaluated multiple times to take a message from the hub each time. The
caller is responsible for unsubscribing from the hub by shutting down the
queue.

```ts
export declare const subscribe: <A>(self: THub<A>) => USTM<TDequeue<A>>;
```

### subscribeScoped

Subscribes to receive messages from the hub. The resulting subscription can
be evaluated multiple times within the scope to take a message from the hub
each time.

```ts
export declare const subscribeScoped: <A>(self: THub<A>) => Effect<Scope, never, TDequeue<A>>;
```

### unbounded

Creates an unbounded hub.

```ts
export declare const unbounded: <A>() => USTM<THub<A>>;
```

