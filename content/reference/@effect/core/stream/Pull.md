## Pull

```ts
export type Pull<R, E, A> = Effect<R, Maybe<E>, Chunk<A>>;
```

## General API

### emit

```ts
export declare const emit: <A>(a: A) => Effect<never, never, Chunk<A>>;
```

### emitChunk

```ts
export declare const emitChunk: <A>(as: Chunk<A>) => Effect<never, never, Chunk<A>>;
```

### empty

```ts
export declare const empty: <A>() => Effect<never, never, Chunk<A>>;
```

### end

```ts
export declare const end: Effect<never, Maybe<never>, never>;
```

### fail

```ts
export declare const fail: <E>(e: E) => Effect<never, Maybe<E>, never>;
```

### failCause

```ts
export declare const failCause: <E>(cause: Cause<E>) => Effect<never, Maybe<E>, never>;
```

### fromDequeue

```ts
export declare const fromDequeue: <E, A>(queue: Dequeue<Take<E, A>>) => Effect<never, Maybe<E>, Chunk<A>>;
```

