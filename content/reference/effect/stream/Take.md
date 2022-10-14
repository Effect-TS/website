## Take

Reference Documentation for the module '@effect/stream/Take'

A `Take<E, A>` represents a single `take` from a queue modeling a stream of
values. A `Take` may be a failure cause `Cause<E>`, an chunk value `A` or an
end-of-stream marker.

```ts
export interface Take<E, A> extends Equals {
    readonly [TakeSym]: TakeSym;
    readonly [_E]: () => E;
    readonly [_A]: () => A;
}
```

## Methods

### chunk

Creates a `Take<never, A>` with the specified chunk.

```ts
export declare const chunk: <A>(chunk: Chunk<A>) => Take<never, A>;
```

### die

Creates a failing `Take<never, never>` with the specified defect.

```ts
export declare const die: (defect: unknown) => Take<never, never>;
```

### dieMessage

Creates a failing `Take<never, never>` with the specified error message.

```ts
export declare const dieMessage: (message: string) => Take<never, never>;
```

### done

Transforms `Take<E, A>` to an `Effect<never, Maybe<E>, Chunk<A>>`.

```ts
export declare const done: <E, A>(self: Take<E, A>) => Effect<never, Maybe<E>, Chunk<A>>;
```

### end

End-of-stream marker.

```ts
export declare const end: Take<never, never>;
```

### exit

```ts
export declare const exit: <E, A>(self: Take<E, A>) => Exit<Maybe<E>, Chunk<A>>;
```

### fail

Creates a failing `Take<E, unknown>` with the specified failure.

```ts
export declare const fail: <E>(e: E) => Take<E, never>;
```

### failCause

Creates a failing `Take<E, never>` with the specified cause.

```ts
export declare const failCause: <E>(cause: Cause<E>) => Take<E, never>;
```

### fold

Folds over the failure cause, success value and end-of-stream marker to
yield a value.

```ts
export declare const fold: <E, A, Z>(end: Z, error: (cause: Cause<E>) => Z, value: (chunk: Chunk<A>) => Z) => (self: Take<E, A>) => Z;
```

### foldEffect

Effectful version of `Take.fold`.

Folds over the failure cause, success value and end-of-stream marker to
yield an effect.

```ts
export declare const foldEffect: <R, E1, Z, E, R1, E2, A, R2, E3>(end: Effect<R, E1, Z>, error: (cause: Cause<E>) => Effect<R1, E2, Z>, value: (chunk: Chunk<A>) => Effect<R2, E3, Z>) => (self: Take<E, A>) => Effect<R | R1 | R2, E1 | E2 | E3, Z>;
```

### fromEffect

Creates an effect from `Effect<R, E, A>` that does not fail, but succeeds
with the `Take<E, A>`. Any error returned from the stream when pulling is
converted to `Take.halt`. Creates a singleton chunk.

```ts
export declare const fromEffect: <R, E, A>(effect: Effect<R, E, A>) => Effect<R, never, Take<E, A>>;
```

### fromExit

Creates a `Take<E, A>` from `Exit<E, A>`.

```ts
export declare const fromExit: <E, A>(exit: Exit<E, A>) => Take<E, A>;
```

### fromPull

Creates effect from `Pull<R, E, A>` that does not fail, but succeeds with the
`Take<E, A>`. Any error returned from stream when pulling is converted to
`Take.failCause`, and the end of stream to `Take.end`.

```ts
export declare const fromPull: <R, E, A>(pull: Pull<R, E, A>) => Effect<R, never, Take<E, A>>;
```

### isDone

Checks if this `take` is done (`Take.end`).

```ts
export declare const isDone: <E, A>(self: Take<E, A>) => boolean;
```

### isFailure

Checks if this `Take` is a failure.

```ts
export declare const isFailure: <E, A>(self: Take<E, A>) => boolean;
```

### isSuccess

Checks if this `Take` is a success.

```ts
export declare const isSuccess: <E, A>(self: Take<E, A>) => boolean;
```

### map

Transforms `Take<E, A>` to `Take<E, B>` by applying function `f`.

```ts
export declare const map: <E, A, B>(f: (a: A) => B) => (self: Take<E, A>) => Take<E, B>;
```

### single

Creates a `Take<never, A>` with a singleton chunk.

```ts
export declare const single: <A>(a: A) => Take<never, A>;
```

### tap

Returns an effect that effectfully "peeks" at the success of this take.

```ts
export declare const tap: <A, R, E, E1, X>(f: (chunk: Chunk<A>) => Effect<R, E1, X>) => (self: Take<E, A>) => Effect<R, E1, void>;
```

