## Hub

A `Hub<A>` is an asynchronous message hub into which publishers can publish
messages of type `A` and subscribers can subscribe to take messages of type
`A`.

```ts
export interface Hub<A> extends Enqueue<A> {
    get [HubSym](): HubSym;
    /**
     * Publishes a message to the hub, returning whether the message was published
     * to the hub.
     */
    publish(this: this, a: A): Effect<never, never, boolean>;
    /**
     * Publishes all of the specified messages to the hub, returning whether they
     * were published to the hub.
     */
    publishAll(this: this, as: Collection<A>): Effect<never, never, boolean>;
    /**
     * Subscribes to receive messages from the hub. The resulting subscription can
     * be evaluated multiple times within the scope to take a message from the hub
     * each time.
     */
    get subscribe(): Effect<Scope, never, Dequeue<A>>;
}
```

## General API

### backPressureStrategy

```ts
export declare const backPressureStrategy: <A>() => Strategy<A>;
```

### bounded

Creates a bounded hub with the back pressure strategy. The hub will retain
messages until they have been taken by all subscribers, applying back
pressure to publishers if the hub is at capacity.

For best performance use capacities that are powers of two.

```ts
export declare const bounded: <A>(requestedCapacity: number) => Effect<never, never, Hub<A>>;
```

### dropping

Creates a bounded hub with the dropping strategy. The hub will drop new
messages if the hub is at capacity.

For best performance use capacities that are powers of two.

```ts
export declare const dropping: <A>(requestedCapacity: number) => Effect<never, never, Hub<A>>;
```

### droppingStrategy

```ts
export declare const droppingStrategy: <A>() => Strategy<A>;
```

### sliding

Creates a bounded hub with the sliding strategy. The hub will add new
messages and drop old messages if the hub is at capacity.

For best performance use capacities that are powers of two.

```ts
export declare const sliding: <A>(requestedCapacity: number) => Effect<never, never, Hub<A>>;
```

### slidingStrategy

```ts
export declare const slidingStrategy: <A>() => Strategy<A>;
```

### unbounded

Creates an unbounded hub.

```ts
export declare const unbounded: <A>() => Effect<never, never, Hub<A>>;
```

