## Pull

Reference Documentation for the module '@effect/stream/Pull'

An`Effect<R, E, A>` value is an immutable value that lazily describes a
workflow or job. The workflow requires some environment `R`, and may fail
with an error of type `E`, or succeed with a value of type `A`.

These lazy workflows, referred to as _effects_, can be informally thought of
as functions in the form:

```typescript
(environment: R) => Either<E, A>
```

Effects model resourceful interaction with the outside world, including
synchronous, asynchronous, concurrent, and parallel interaction.

Effects use a fiber-based concurrency model, with built-in support for
scheduling, fine-grained interruption, structured concurrency, and high
scalability.

To run an effect, you need a `Runtime`, which is capable of executing
effects.

```ts
export interface Effect<R, E, A> {
    readonly [EffectURI]: {
        _R: (_: never) => R;
        _E: (_: never) => E;
        _A: (_: never) => A;
    };
}
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

