## Stream

Reference Documentation for the module '@effect/stream/Stream'

A `Stream<R, E, A>` is a description of a program that, when evaluated, may
emit zero or more values of type `A`, may fail with errors of type `E`, and
uses an environment of type `R`. One way to think of `Stream` is as a
`Effect` program that could emit multiple values.

`Stream` is a purely functional *pull* based stream. Pull based streams offer
inherent laziness and backpressure, relieving users of the need to manage
buffers between operators. As an optimization, `Stream` does not emit
single values, but rather an array of values. This allows the cost of effect
evaluation to be amortized.

`Stream` forms a monad on its `A` type parameter, and has error management
facilities for its `E` type parameter, modeled similarly to `Effect` (with
some adjustments for the multiple-valued nature of `Stream`). These aspects
allow for rich and expressive composition of streams.

```ts
export interface Stream<R, E, A> {
    readonly [StreamSym]: StreamSym;
    readonly [_R]: () => R;
    readonly [_E]: () => E;
    readonly [_A]: () => A;
}
```

## General API

### absolve

Submerges the error case of an `Either` into the `Stream`.

```ts
export declare const absolve: <R, E, E2, A>(self: Stream<R, E, Either<E2, A>>) => Stream<R, E | E2, A>;
```

### acquireRelease

Creates a stream from a single value that will get cleaned up after the
stream is consumed.

```ts
export declare const acquireRelease: <R, E, A, R2, Z>(acquire: Effect<R, E, A>, release: (a: A) => Effect<R2, never, Z>) => Stream<R | R2, E, A>;
```

### acquireReleaseExit

Creates a stream from a single value that will get cleaned up after the
stream is consumed.

```ts
export declare const acquireReleaseExit: <R, E, A, R2, Z>(acquire: Effect<R, E, A>, release: (a: A, exit: Exit<unknown, unknown>) => Effect<R2, never, Z>) => Stream<R | R2, E, A>;
```

### aggregate

Aggregates elements of this stream using the provided sink for as long as
the downstream operators on the stream are busy.

This operator divides the stream into two asynchronous "islands". Operators
upstream of this operator run on one fiber, while downstream operators run
on another. Whenever the downstream fiber is busy processing elements, the
upstream fiber will feed elements into the sink until it signals
completion.

Any sink can be used here, but see `Sink.foldWeightedEffect` and
`Sink.foldUntilEffect` for sinks that cover the common usecases.

```ts
export declare const aggregate: <R, E, A, R2, E2, A2, B>(sink: Sink<R2, E | E2, A | A2, A2, B>) => (self: Stream<R, E, A>) => Stream<R | R2, E | E2, B>;
```

### aggregateWithin

Like `aggregateWithinEither`, but only returns the `Right` results.

```ts
export declare const aggregateWithin: <A, R2, E2, A2, S, R3, B, C>(sink: Sink<R2, E2, A | A2, A2, B>, schedule: Schedule<S, R3, Maybe<B>, C>) => <R, E>(self: Stream<R, E, A>) => Stream<R2 | R3 | R, E2 | E, B>;
```

### aggregateWithinEither

Aggregates elements using the provided sink until it completes, or until
the delay signalled by the schedule has passed.

This operator divides the stream into two asynchronous islands. Operators
upstream of this operator run on one fiber, while downstream operators run
on another. Elements will be aggregated by the sink until the downstream
fiber pulls the aggregated value, or until the schedule's delay has passed.

Aggregated elements will be fed into the schedule to determine the delays
between pulls.

```ts
export declare const aggregateWithinEither: <A, R2, E2, A2, S, R3, B, C>(sink: Sink<R2, E2, A | A2, A2, B>, schedule: Schedule<S, R3, Maybe<B>, C>) => <R, E>(self: Stream<R, E, A>) => Stream<R2 | R3 | R, E2 | E, Either<C, B>>;
```

### as

Maps the success values of this stream to the specified constant value.

```ts
export declare const as: <A2>(a: A2) => <R, E, A>(self: Stream<R, E, A>) => Stream<R, E, A2>;
```

### async

```ts
export declare const async: <R, E, A>(register: (emit: Emit<R, E, A, void>) => void, outputBuffer?: number) => Stream<R, E, A>;
```

### asyncEffect

Creates a stream from an asynchronous callback that can be called multiple
times The registration of the callback itself returns an effect. The
optionality of the error type `E` can be used to signal the end of the
stream, by setting it to `None`.

```ts
export declare const asyncEffect: <R, E, A, Z>(register: (emit: Emit<R, E, A, void>) => Effect<R, E, Z>, outputBuffer?: number) => Stream<R, E, A>;
```

### asyncInterrupt

Creates a stream from an asynchronous callback that can be called multiple
times. The registration of the callback returns either a canceler or
synchronously returns a stream. The optionality of the error type `E` can be
used to signal the end of the stream, by setting it to `None`.

```ts
export declare const asyncInterrupt: <R, E, A>(register: (emit: Emit<R, E, A, void>) => Either<Effect<R, never, void>, Stream<R, E, A>>, outputBuffer?: number) => Stream<R, E, A>;
```

### asyncMaybe

Creates a stream from an asynchronous callback that can be called multiple
times. The registration of the callback can possibly return the stream
synchronously. The optionality of the error type `E` can be used to signal
the end of the stream, by setting it to `None`.

```ts
export declare const asyncMaybe: <R, E, A>(register: (emit: Emit<R, E, A, void>) => Maybe<Stream<R, E, A>>, outputBuffer?: number) => Stream<R, E, A>;
```

### asyncScoped

Creates a stream from an asynchronous callback that can be called multiple
times. The registration of the callback itself returns an a scoped
resource. The optionality of the error type `E` can be used to signal the
end of the stream, by setting it to `None`.

```ts
export declare const asyncScoped: <R, E, A>(register: (f: (effect: Effect<R, Maybe<E>, Chunk<A>>) => void) => Effect<Scope | R, E, unknown>, outputBuffer?: number) => Stream<R, E, A>;
```

### bind

```ts
export declare const bind: <N extends string, K, R2, E2, A>(tag: Exclude<N, keyof K>, f: (_: K) => Stream<R2, E2, A>) => <R, E>(self: Stream<R, E, K>) => Stream<R2 | R, E2 | E, K & { [k in N]: A; }>;
```

### bindValue

```ts
export declare const bindValue: <N extends string, K, A>(tag: Exclude<N, keyof K>, f: (_: K) => A) => <R, E>(self: Stream<R, E, K>) => Stream<R, E, K & { [k in N]: A; }>;
```

### branchAfter

Reads the first `n` values from the stream and uses them to choose the
pipeline that will be used for the remainder of the stream.

```ts
export declare const branchAfter: <R, E, A, R2, E2, B>(n: number, f: (output: Chunk<A>) => Pipeline<R, E, A, R2, E2, B>) => (self: Stream<R, E, A>) => Stream<R | R2, E | E2, B>;
```

### broadcast

Fan out the stream, producing a list of streams that have the same elements
as this stream. The driver stream will only ever advance the `maximumLag`
chunks before the slowest downstream stream.

```ts
export declare const broadcast: (n: number, maximumLag: number) => <R, E, A>(self: Stream<R, E, A>) => Effect<Scope | R, never, Chunk<Stream<never, E, A>>>;
```

### broadcastDynamic

Fan out the stream, producing a dynamic number of streams that have the
same elements as this stream. The driver stream will only ever advance the
`maximumLag` chunks before the slowest downstream stream.

```ts
export declare const broadcastDynamic: (maximumLag: number) => <R, E, A>(self: Stream<R, E, A>) => Effect<Scope | R, never, Stream<never, E, A>>;
```

### broadcastedQueues

Converts the stream to a managed list of queues. Every value will be
replicated to every queue with the slowest queue being allowed to buffer
`maximumLag` chunks before the driver is back pressured.

Queues can unsubscribe from upstream by shutting down.

```ts
export declare const broadcastedQueues: (n: number, maximumLag: number) => <R, E, A>(self: Stream<R, E, A>) => Effect<Scope | R, never, Chunk<Dequeue<Take<E, A>>>>;
```

### broadcastedQueuesDynamic

Converts the stream to a managed dynamic amount of queues. Every chunk will
be replicated to every queue with the slowest queue being allowed to buffer
`maximumLag` chunks before the driver is back pressured.

Queues can unsubscribe from upstream by shutting down.

```ts
export declare const broadcastedQueuesDynamic: (maximumLag: number) => <R, E, A>(self: Stream<R, E, A>) => Effect<Scope | R, never, Effect<Scope, never, Dequeue<Take<E, A>>>>;
```

### buffer

Allows a faster producer to progress independently of a slower consumer by
buffering up to `capacity` elements in a queue.

This combinator destroys the chunking structure. It's recommended to use
rechunk afterwards.

Note: prefer capacities that are powers of 2 for better performance.

```ts
export declare const buffer: (capacity: number) => <R, E, A>(self: Stream<R, E, A>) => Stream<R, E, A>;
```

### bufferChunks

Allows a faster producer to progress independently of a slower consumer by
buffering up to `capacity` chunks in a queue.

Note: prefer capacities that are powers of 2 for better performance.

```ts
export declare const bufferChunks: (capacity: number) => <R, E, A>(self: Stream<R, E, A>) => Stream<R, E, A>;
```

### bufferDropping

Allows a faster producer to progress independently of a slower consumer by
buffering up to `capacity` elements in a dropping queue.

This combinator destroys the chunking structure. It's recommended to use
rechunk afterwards.

Note: prefer capacities that are powers of 2 for better performance.

```ts
export declare const bufferDropping: (capacity: number) => <R, E, A>(self: Stream<R, E, A>) => Stream<R, E, A>;
```

### bufferSliding

Allows a faster producer to progress independently of a slower consumer by
buffering up to `capacity` elements in a sliding queue.

This combinator destroys the chunking structure. It's recommended to use
rechunk afterwards.

Note: prefer capacities that are powers of 2 for better performance.

```ts
export declare const bufferSliding: (capacity: number) => <R, E, A>(self: Stream<R, E, A>) => Stream<R, E, A>;
```

### bufferUnbounded

Allows a faster producer to progress independently of a slower consumer by
buffering chunks into an unbounded queue.

```ts
export declare const bufferUnbounded: <R, E, A>(self: Stream<R, E, A>) => Stream<R, E, A>;
```

### catchAll

Switches over to the stream produced by the provided function in case this
one fails with a typed error.

```ts
export declare const catchAll: <E, R2, E2, A2>(f: (e: E) => Stream<R2, E2, A2>) => <R, A>(self: Stream<R, E, A>) => Stream<R2 | R, E2, A2 | A>;
```

### catchAllCause

Switches over to the stream produced by the provided function in case this
one fails. Allows recovery from all causes of failure, including
interruption if the stream is uninterruptible.

```ts
export declare const catchAllCause: <E, R2, E2, A2>(f: (cause: Cause<E>) => Stream<R2, E2, A2>) => <R, A>(self: Stream<R, E, A>) => Stream<R2 | R, E2, A2 | A>;
```

### catchSome

Switches over to the stream produced by the provided function in case this
one fails with some typed error.

```ts
export declare const catchSome: <E, R2, E2, A2>(pf: (e: E) => Maybe<Stream<R2, E2, A2>>) => <R, A>(self: Stream<R, E, A>) => Stream<R2 | R, E | E2, A2 | A>;
```

### catchSomeCause

Switches over to the stream produced by the provided function in case this
one fails with some errors. Allows recovery from all causes of failure,
including interruption if the stream is uninterruptible.

```ts
export declare const catchSomeCause: <E, R2, E2, A2>(pf: (cause: Cause<E>) => Maybe<Stream<R2, E2, A2>>) => <R, A>(self: Stream<R, E, A>) => Stream<R2 | R, E | E2, A2 | A>;
```

### catchTag

Recovers from specified error.

```ts
export declare const catchTag: <K extends E["_tag"] & string, E extends { _tag: string; }, R1, E1, A1>(k: K, f: (e: Extract<E, { _tag: K; }>) => Stream<R1, E1, A1>) => <R, A>(self: Stream<R, E, A>) => Stream<R1 | R, E1 | Exclude<E, { _tag: K; }>, A1 | A>;
```

### changes

Returns a new stream that only emits elements that are not equal to the
previous element emitted, using strict equality to determine whether two
elements are equal.

```ts
export declare const changes: <R, E, A>(self: Stream<R, E, A>) => Stream<R, E, A>;
```

### changesWith

Returns a new stream that only emits elements that are not equal to the
previous element emitted, using the specified function to determine whether
two elements are equal.

```ts
export declare const changesWith: <A>(f: (x: A, y: A) => boolean) => <R, E>(self: Stream<R, E, A>) => Stream<R, E, A>;
```

### changesWithEffect

Returns a new stream that only emits elements that are not equal to the
previous element emitted, using the specified effectual function to
determine whether two elements are equal.

```ts
export declare const changesWithEffect: <A, R2, E2>(f: (x: A, y: A) => Effect<R2, E2, boolean>) => <R, E>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, A>;
```

### channelWith

Performs the specified operation with the channel underlying this stream.

```ts
export declare const channelWith: <R, E, A, R1, E1, A1>(f: (channel: Channel<R, unknown, unknown, unknown, E, Chunk<A>, unknown>) => Channel<R1, unknown, unknown, unknown, E1, Chunk<A1>, unknown>) => (self: Stream<R, E, A>) => Stream<R | R1, E | E1, A1>;
```

### chunks

Exposes the underlying chunks of the stream as a stream of chunks of
elements.

```ts
export declare const chunks: <R, E, A>(self: Stream<R, E, A>) => Stream<R, E, Chunk<A>>;
```

### chunksWith

Performs the specified stream transformation with the chunk structure of
the stream exposed.

```ts
export declare const chunksWith: <R, E, A, R1, E1, A1>(f: (stream: Stream<R, E, Chunk<A>>) => Stream<R1, E1, Chunk<A1>>) => (self: Stream<R, E, A>) => Stream<R | R1, E | E1, A1>;
```

### collect

Performs a filter and map in a single step.

```ts
export declare const collect: <A, B>(pf: (a: A) => Maybe<B>) => <R, E>(self: Stream<R, E, A>) => Stream<R, E, B>;
```

### collectEffect

Performs an effectful filter and map in a single step.

```ts
export declare const collectEffect: <A, R2, E2, A2>(pf: (a: A) => Maybe<Effect<R2, E2, A2>>) => <R, E>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, A2>;
```

### collectLeft

Filters any `Right` values.

```ts
export declare const collectLeft: <R, E, L, A>(self: Stream<R, E, Either<L, A>>) => Stream<R, E, L>;
```

### collectRight

Filters any `Left` values.

```ts
export declare const collectRight: <R, E, L, A>(self: Stream<R, E, Either<L, A>>) => Stream<R, E, A>;
```

### collectSome

Filters any 'None' values.

```ts
export declare const collectSome: <R, E, A>(self: Stream<R, E, Maybe<A>>) => Stream<R, E, A>;
```

### collectSuccess

Filters any `Exit.Failure` values.

```ts
export declare const collectSuccess: <R, E, L, A>(self: Stream<R, E, Exit<L, A>>) => Stream<R, E, A>;
```

### collectWhile

Transforms all elements of the stream for as long as the specified partial
function is defined.

```ts
export declare const collectWhile: <A, A1>(pf: (a: A) => Maybe<A1>) => <R, E>(self: Stream<R, E, A>) => Stream<R, E, A1>;
```

### collectWhileEffect

Effectfully transforms all elements of the stream for as long as the
specified partial function is defined.

```ts
export declare const collectWhileEffect: <A, R2, E2, A2>(pf: (a: A) => Maybe<Effect<R2, E2, A2>>) => <R, E>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, A2>;
```

### collectWhileLeft

Terminates the stream when encountering the first `Right`.

```ts
export declare const collectWhileLeft: <R, E, L, A>(self: Stream<R, E, Either<L, A>>) => Stream<R, E, L>;
```

### collectWhileRight

Terminates the stream when encountering the first `Left`.

```ts
export declare const collectWhileRight: <R, E, L, A>(self: Stream<R, E, Either<L, A>>) => Stream<R, E, A>;
```

### collectWhileSome

Terminates the stream when encountering the first `None`.

```ts
export declare const collectWhileSome: <R, E, L, A>(self: Stream<R, E, Maybe<A>>) => Stream<R, E, A>;
```

### collectWhileSuccess

Terminates the stream when encountering the first `Exit.Failure`.

```ts
export declare const collectWhileSuccess: <R, E, L, A>(self: Stream<R, E, Exit<L, A>>) => Stream<R, E, A>;
```

### combine

Combines the elements from this stream and the specified stream by
repeatedly applying the function `f` to extract an element using both sides
and conceptually "offer" it to the destination stream. `f` can maintain
some internal state to control the combining process, with the initial
state being specified by `s`.

Where possible, prefer `Stream.combineChunks` for a more efficient
implementation.

```ts
export declare const combine: <R, E, A, R2, E2, A2, S, A3>(that: Stream<R2, E2, A2>, s: S, f: (s: S, pullLeft: Effect<R, Maybe<E>, A>, pullRight: Effect<R2, Maybe<E2>, A2>) => Effect<R | R2, never, Exit<Maybe<E | E2>, readonly [A3, S]>>) => (self: Stream<R, E, A>) => Stream<R | R2, E | E2, A3>;
```

### combineChunks

Combines the chunks from this stream and the specified stream by repeatedly
applying the function `f` to extract a chunk using both sides and
conceptually "offer" it to the destination stream. `f` can maintain some
internal state to control the combining process, with the initial state
being specified by `s`.

```ts
export declare const combineChunks: <R, E, A, R2, E2, A2, S, A3>(that: Stream<R2, E2, A2>, s: S, f: (s: S, pullLeft: Effect<R, Maybe<E>, Chunk<A>>, pullRight: Effect<R2, Maybe<E2>, Chunk<A2>>) => Effect<R | R2, never, Exit<Maybe<E | E2>, readonly [Chunk<A3>, S]>>) => (self: Stream<R, E, A>) => Stream<R | R2, E | E2, A3>;
```

### concat

Concatenates the specified stream with this stream, resulting in a stream
that emits the elements from this stream and then the elements from the
specified stream.

```ts
export declare const concat: <R1, E1, A1>(that: Stream<R1, E1, A1>) => <R, E, A>(self: Stream<R, E, A>) => Stream<R1 | R, E1 | E, A1 | A>;
```

### concatAll

Concatenates all of the streams in the chunk to one stream.

```ts
export declare const concatAll: <R, E, A>(streams: Chunk<Stream<R, E, A>>) => Stream<R, E, A>;
```

### cross

Composes this stream with the specified stream to create a cartesian
product of elements. The `that` stream would be run multiple times, for
every element in the `this` stream.

See also `Stream.zip` for the more common point-wise variant.

```ts
export declare const cross: <R2, E2, A2>(that: Stream<R2, E2, A2>) => <R, E, A>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, readonly [A, A2]>;
```

### crossFlatten

Composes this stream with the specified stream to create a cartesian
product of elements. The `that` stream would be run multiple times, for
every element in the `this` stream.

See also `Stream.zip` for the more common point-wise variant.

```ts
export declare const crossFlatten: <R2, E2, A2>(that: Stream<R2, E2, A2>) => <R, E, A extends readonly any[]>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, readonly [...A, A2]>;
```

### crossLeft

Composes this stream with the specified stream to create a cartesian
product of elements, but keeps only elements from this stream. The `that`
stream would be run multiple times, for every element in the `this` stream.

See also `Stream.zipLeft` for the more common point-wise variant.

```ts
export declare const crossLeft: <R2, E2, A2>(that: Stream<R2, E2, A2>) => <R, E, A>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, A>;
```

### crossRight

Composes this stream with the specified stream to create a cartesian
product of elements, but keeps only elements from that stream. The `that`
stream would be run multiple times, for every element in the `this` stream.

See also `Stream.zipRight` for the more common point-wise variant.

```ts
export declare const crossRight: <R2, E2, A2>(that: Stream<R2, E2, A2>) => <R, E, A>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, A2>;
```

### crossWith

Composes this stream with the specified stream to create a cartesian
product of elements with a specified function. The `that` stream would be
run multiple times, for every element in the `this` stream.

See also `Stream.zip` for the more common point-wise variant.

```ts
export declare const crossWith: <R2, E2, B, A, C>(that: Stream<R2, E2, B>, f: (a: A, b: B) => C) => <R, E>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, C>;
```

### debounce

Delays the emission of values by holding new values for a set duration. If
no new values arrive during that time the value is emitted, however if a
new value is received during the holding period the previous value is
discarded and the process is repeated with the new value.

This operator is useful if you have a stream of "bursty" events which
eventually settle down and you only need the final event of the burst.

```ts
export declare const debounce: <R, E, A>(duration: Duration) => (self: Stream<R, E, A>) => Stream<R, E, A>;
```

### defaultIfEmpty

If this stream is empty, produce the specified element or chunk of elements,
or switch to the specified stream.

```ts
export declare const defaultIfEmpty: { <R1, E1, A1>(stream: Stream<R1, E1, A1>): <R, E, A>(self: Stream<R, E, A>) => Stream<R1 | R, E1 | E, A1 | A>; <A1>(chunk: Chunk<A1>): <R, E, A>(self: Stream<R, E, A>) => Stream<R, E, A1 | A>; <A1>(value: A1): <R, E, A>(self: Stream<R, E, A>) => Stream<R, E, A1 | A>; };
```

### die

Returns a stream that dies with the specified defect.

```ts
export declare const die: (defect: unknown) => Stream<never, never, never>;
```

### dieMessage

The stream that dies with an exception described by `msg`.

```ts
export declare const dieMessage: (message: string) => Stream<never, never, never>;
```

### dieSync

Returns a stream that dies with the specified defect.

```ts
export declare const dieSync: (defect: LazyArg<unknown>) => Stream<never, never, never>;
```

### distributedWith

More powerful version of `Stream.broadcast`. Allows to provide a function
that determines what queues should receive which elements. The decide
function will receive the indices of the queues in the resulting list.

```ts
export declare const distributedWith: <A>(n: number, maximumLag: number, decide: (a: A) => Effect<never, never, Predicate<number>>) => <R, E>(self: Stream<R, E, A>) => Effect<Scope | R, never, List<Dequeue<Exit<Maybe<E>, A>>>>;
```

### distributedWithDynamic

More powerful version of `Stream.distributedWith`. This returns a function
that will produce new queues and corresponding indices. You can also provide
a function that will be executed after the final events are enqueued in all
queues. Shutdown of the queues is handled by the driver. Downstream users can
also shutdown queues manually. In this case the driver will continue but no
longer backpressure on them.

```ts
export declare const distributedWithDynamic: <A, E, Z>(maximumLag: number, decide: (a: A) => Effect<never, never, (key: number) => boolean>, done?: (exit: Exit<Maybe<E>, never>) => Effect<never, never, Z>) => <R>(self: Stream<R, E, A>) => Effect<Scope | R, never, Effect<never, never, readonly [number, Dequeue<Exit<Maybe<E>, A>>]>>;
```

### done

A stream that ends with the specified `Exit` value.

```ts
export declare const done: <E, A>(exit: Exit<E, A>) => Stream<never, E, A>;
```

### drain

Converts this stream to a stream that executes its effects but emits no
elements. Useful for sequencing effects using streams.

```ts
export declare const drain: <R, E, A>(self: Stream<R, E, A>) => Stream<R, E, never>;
```

### drainFork

Drains the provided stream in the background for as long as this stream is
running. If this stream ends before `other`, `other` will be interrupted.
If `other` fails, this stream will fail with that error.

```ts
export declare const drainFork: <R2, E2, Z>(other: Stream<R2, E2, Z>) => <R, E, A>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, A>;
```

### drop

Drops the specified number of elements from this stream.

```ts
export declare const drop: (n: number) => <R, E, A>(self: Stream<R, E, A>) => Stream<R, E, A>;
```

### dropRight

Drops the last specified number of elements from this stream.

Note: this combinator keeps `n` elements in memory. Be careful with big
numbers.

```ts
export declare const dropRight: (n: number) => <R, E, A>(self: Stream<R, E, A>) => Stream<R, E, A>;
```

### dropUntil

Creates a pipeline that drops elements until the specified predicate
evaluates to true.

```ts
export declare const dropUntil: <A>(f: Predicate<A>) => <R, E>(self: Stream<R, E, A>) => Stream<R, E, A>;
```

### dropWhile

Creates a pipeline that drops elements while the specified predicate
evaluates to `true`.

```ts
export declare const dropWhile: <A>(f: Predicate<A>) => <R, E>(self: Stream<R, E, A>) => Stream<R, E, A>;
```

### dropWhileEffect

Drops all elements of the stream for as long as the specified predicate
produces an effect that evalutates to `true`.

```ts
export declare const dropWhileEffect: <A, R2, E2>(f: (a: A) => Effect<R2, E2, boolean>) => <R, E>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, A>;
```

### either

Returns a stream whose failures and successes have been lifted into an
`Either`. The resulting stream cannot fail, because the failures have been
exposed as part of the `Either` success case.

```ts
export declare const either: <R, E, A>(self: Stream<R, E, A>) => Stream<R, never, Either<E, A>>;
```

### empty

The empty stream.

```ts
export declare const empty: Stream<never, never, never>;
```

### ensuring

Executes the provided finalizer after this stream's finalizers run.

```ts
export declare const ensuring: <R1, Z>(finalizer: Effect<R1, never, Z>) => <R, E, A>(self: Stream<R, E, A>) => Stream<R1 | R, E, A>;
```

### environment

Accesses the whole environment of the stream.

```ts
export declare const environment: <R>() => Stream<R, never, Env<R>>;
```

### environmentWith

Accesses the environment of the stream.

```ts
export declare const environmentWith: <R, A>(f: (env: Env<R>) => A) => Stream<R, never, A>;
```

### environmentWithEffect

Accesses the environment of the stream in the context of an effect.

```ts
export declare const environmentWithEffect: <R0, R, E, A>(f: (env: Env<R0>) => Effect<R, E, A>) => Stream<R0 | R, E, A>;
```

### environmentWithStream

Accesses the environment of the stream in the context of a stream.

```ts
export declare const environmentWithStream: <R0, R, E, A>(f: (env: Env<R0>) => Stream<R, E, A>) => Stream<R0 | R, E, A>;
```

### execute

Creates a stream that executes the specified effect but emits no elements.

```ts
export declare const execute: <R, E, Z>(effect: Effect<R, E, Z>) => Stream<R, E, never>;
```

### fail

Returns a stream that always fails with the specified `error`.

```ts
export declare const fail: <E>(error: E) => Stream<never, E, never>;
```

### failCause

Returns a stream that always fails with the specified `Cause`.

```ts
export declare const failCause: <E>(cause: Cause<E>) => Stream<never, E, never>;
```

### failCauseSync

Returns a stream that always fails with the specified `Cause`.

```ts
export declare const failCauseSync: <E>(cause: LazyArg<Cause<E>>) => Stream<never, E, never>;
```

### failSync

Returns a stream that always fails with the specified `error`.

```ts
export declare const failSync: <E>(error: LazyArg<E>) => Stream<never, E, never>;
```

### filter

Filters the elements emitted by this stream using the provided function.

```ts
export declare const filter: { <A, B extends A>(f: Refinement<A, B>): <R, E>(self: Stream<R, E, A>) => Stream<R, E, B>; <A>(f: Predicate<A>): <R, E>(self: Stream<R, E, A>) => Stream<R, E, A>; };
```

### filterEffect

Effectfully filters the elements emitted by this stream.

```ts
export declare const filterEffect: <A, R1, E1>(f: (a: A) => Effect<R1, E1, boolean>) => <R, E>(self: Stream<R, E, A>) => Stream<R1 | R, E1 | E, A>;
```

### filterNot

Filters this stream by the specified predicate, removing all elements for
which the predicate evaluates to true.

```ts
export declare const filterNot: { <A, B extends A>(f: Refinement<A, B>): <R, E>(self: Stream<R, E, A>) => Stream<R, E, A>; <A>(f: Predicate<A>): <R, E>(self: Stream<R, E, A>) => Stream<R, E, A>; };
```

### finalizer

Creates a one-element stream that never fails and executes the finalizer
when it ends.

```ts
export declare const finalizer: <R, Z>(finalizer: Effect<R, never, Z>) => Stream<R, never, void>;
```

### find

Finds the first element emitted by this stream that satisfies the provided
predicate.

```ts
export declare const find: { <A, B extends A>(f: Refinement<A, B>): <R, E>(self: Stream<R, E, A>) => Stream<R, E, B>; <A>(f: Predicate<A>): <R, E>(self: Stream<R, E, A>) => Stream<R, E, A>; };
```

### findEffect

Finds the first element emitted by this stream that satisfies the provided
effectful predicate.

```ts
export declare const findEffect: <R1, E1, A>(f: (a: A) => Effect<R1, E1, boolean>) => <R, E>(self: Stream<R, E, A>) => Stream<R1 | R, E1 | E, A>;
```

### fixed

Emits elements of this stream with a fixed delay in between, regardless of
how long it takes to produce a value.

```ts
export declare const fixed: (duration: Duration) => <R, E, A>(self: Stream<R, E, A>) => Stream<R, E, A>;
```

### flatMap

Returns a stream made of the concatenation in strict order of all the
streams produced by passing each element of this stream to `f0`

```ts
export declare const flatMap: <A, R2, E2, B>(f: (a: A) => Stream<R2, E2, B>) => <R, E>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, B>;
```

### flatMapPar

Maps each element of this stream to another stream and returns the
non-deterministic merge of those streams, executing up to `n` inner streams
concurrently. Up to `bufferSize` elements of the produced streams may be
buffered in memory by this operator.

```ts
export declare const flatMapPar: <R2, E2, A, B>(n: number, f: (a: A) => Stream<R2, E2, B>, bufferSize?: number) => <R, E>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, B>;
```

### flatMapParSwitch

Maps each element of this stream to another stream and returns the
non-deterministic merge of those streams, executing up to `n` inner streams
concurrently. When a new stream is created from an element of the source
stream, the oldest executing stream is cancelled. Up to `bufferSize`
elements of the produced streams may be buffered in memory by this
operator.

```ts
export declare const flatMapParSwitch: <R2, E2, A, B>(n: number, f: (a: A) => Stream<R2, E2, B>, bufferSize?: number) => <R, E>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, B>;
```

### flatten

Flattens this stream-of-streams into a stream made of the concatenation in
strict order of all the streams.

```ts
export declare const flatten: <R, E, R1, E1, A>(self: Stream<R, E, Stream<R1, E1, A>>) => Stream<R | R1, E | E1, A>;
```

### flattenChunks

Submerges the chunks carried by this stream into the stream's structure,
while still preserving them.

```ts
export declare const flattenChunks: <R, E, A>(self: Stream<R, E, Chunk<A>>) => Stream<R, E, A>;
```

### flattenCollection

Submerges the Collections carried by this stream into the stream's structure,
while still preserving them.

```ts
export declare const flattenCollection: <R, E, A>(self: Stream<R, E, Collection<A>>) => Stream<R, E, A>;
```

### flattenExit

Flattens `Exit` values. `Exit.Failure` values translate to stream
failures while `Exit.Success` values translate to stream elements.

```ts
export declare const flattenExit: <R, E, E2, A>(self: Stream<R, E, Exit<E2, A>>) => Stream<R, E | E2, A>;
```

### flattenExitMaybe

Unwraps `Exit` values that also signify end-of-stream by failing with `None`.

For `Exit<E, A>` values that do not signal end-of-stream, prefer:

```typescript
stream.mapEffect((exit) => Effect.done(exit))
```

```ts
export declare const flattenExitMaybe: <R, E, A>(self: Stream<R, E, Exit<Maybe<E>, A>>) => Stream<R, E, A>;
```

### flattenPar

Flattens a stream of streams into a stream by executing a non-deterministic
concurrent merge. Up to `n` streams may be consumed in parallel and up to
`outputBuffer` elements may be buffered by this operator.

```ts
export declare const flattenPar: (n: number, outputBuffer?: number) => <R, E, R1, E1, A>(self: Stream<R, E, Stream<R1, E1, A>>) => Stream<R | R1, E | E1, A>;
```

### flattenParUnbounded

Like `flattenPar`, but executes all streams concurrently.

```ts
export declare const flattenParUnbounded: (outputBuffer?: number) => <R, E, A, R1, E1>(self: Stream<R, E, Stream<R1, E1, A>>) => Stream<R | R1, E | E1, A>;
```

### flattenTake

Unwraps `Exit` values and flatten chunks that also signify end-of-stream
by failing with `None`.

```ts
export declare const flattenTake: <R, E, E2, A>(self: Stream<R, E, Take<E2, A>>) => Stream<R, E | E2, A>;
```

### forever

Repeats this stream forever.

```ts
export declare const forever: <R, E, A>(self: Stream<R, E, A>) => Stream<R, E, A>;
```

### fromChannel

Creates a stream from a `Channel`.

```ts
export declare const fromChannel: <R, E, A>(channel: Channel<R, unknown, unknown, unknown, E, Chunk<A>, unknown>) => Stream<R, E, A>;
```

### fromChunk

Creates a stream from a `Chunk` of values.

```ts
export declare const fromChunk: <A>(chunk: Chunk<A>) => Stream<never, never, A>;
```

### fromChunkHub

Creates a stream from a subscription to a `Hub`.

```ts
export declare const fromChunkHub: <A>(hub: Hub<Chunk<A>>) => Stream<never, never, A>;
```

### fromChunkHubScoped

Creates a stream from a subscription to a hub in the context of a scoped
effect. The scoped effect describes subscribing to receive messages from
the hub while the stream describes taking messages from the hub.

```ts
export declare const fromChunkHubScoped: <A>(hub: Hub<Chunk<A>>) => Effect<Scope, never, Stream<never, never, A>>;
```

### fromChunkHubScopedWithShutdown

Creates a stream from a subscription to a hub in the context of a scoped
effect. The scoped effect describes subscribing to receive messages from
the hub while the stream describes taking messages from the hub.

The hub will be shut down once the stream is closed.

```ts
export declare const fromChunkHubScopedWithShutdown: <A>(hub: Hub<Chunk<A>>) => Effect<Scope, never, Stream<never, never, A>>;
```

### fromChunkHubWithShutdown

Creates a stream from a subscription to a hub.

The hub will be shut down once the stream is closed.

```ts
export declare const fromChunkHubWithShutdown: <A>(hub: Hub<Chunk<A>>) => Stream<never, never, A>;
```

### fromChunkQueue

Creates a stream from a queue of values.

```ts
export declare const fromChunkQueue: <A>(queue: Dequeue<Chunk<A>>) => Stream<never, never, A>;
```

### fromChunkQueueWithShutdown

Creates a stream from a queue of values. The queue will be shutdown once
the stream is closed.

```ts
export declare const fromChunkQueueWithShutdown: <R, E, A>(queue: Dequeue<Chunk<A>>) => Stream<R, E, A>;
```

### fromChunks

Creates a stream from an arbitrary number of chunks.

```ts
export declare const fromChunks: <A>(...chunks: Chunk<A>[]) => Stream<never, never, A>;
```

### fromCollection

Creates a stream from an Collection collection of values.

```ts
export declare const fromCollection: <A>(as: Collection<A>) => Stream<never, never, A>;
```

### fromCollectionEffect

Creates a stream from an effect producing a value of type `Collection<A>`

```ts
export declare const fromCollectionEffect: <R, E, A>(collection: Effect<R, E, Collection<A>>) => Stream<R, E, A>;
```

### fromEffect

Creates a stream from an effect producing a value of type `A`

```ts
export declare const fromEffect: <R, E, A>(effect: Effect<R, E, A>) => Stream<R, E, A>;
```

### fromEffectMaybe

Creates a stream from an effect producing a value of type `A` or an empty
`Stream`.

```ts
export declare const fromEffectMaybe: <R, E, A>(effect: Effect<R, Maybe<E>, A>) => Stream<R, E, A>;
```

### fromHub

Creates a stream from a subscription to a hub.

```ts
export declare const fromHub: <A>(hub: Hub<A>, maxChunkSize?: number) => Stream<never, never, A>;
```

### fromHubScoped

Creates a stream from a subscription to a hub in the context of a scoped
effect. The scoped effect describes subscribing to receive messages from
the hub while the stream describes taking messages from the hub.

```ts
export declare const fromHubScoped: <A>(hub: Hub<A>, maxChunkSize?: number) => Effect<Scope, never, Stream<never, never, A>>;
```

### fromHubScopedWithShutdown

Creates a stream from a subscription to a hub in the context of a scoped
effect. The scoped effect describes subscribing to receive messages from
the hub while the stream describes taking messages from the hub.

The hub will be shut down once the stream is closed.

```ts
export declare const fromHubScopedWithShutdown: <A>(hub: Hub<A>, maxChunkSize?: number) => Effect<Scope, never, Stream<never, never, A>>;
```

### fromHubWithShutdown

Creates a stream from a subscription to a hub.

The hub will be shut down once the stream is closed.

```ts
export declare const fromHubWithShutdown: <A>(hub: Hub<A>, maxChunkSize?: number) => Stream<never, never, A>;
```

### fromPull

```ts
export declare const fromPull: <R, E, A>(effect: Effect<Scope | R, never, Effect<R, Maybe<E>, Chunk<A>>>) => Stream<R, E, A>;
```

### fromQueue

Creates a stream from a `Queue` of values.

```ts
export declare const fromQueue: <A>(queue: Dequeue<A>, maxChunkSize?: number) => Stream<never, never, A>;
```

### fromQueueWithShutdown

Creates a stream from a `Queue` of values. The queue will be shutdown once
the stream is closed.

```ts
export declare const fromQueueWithShutdown: <A>(queue: Dequeue<A>, maxChunkSize?: number) => Stream<never, never, A>;
```

### fromSchedule

Creates a stream from a `Schedule` that does not require any further
input. The stream will emit an element for each value output from the
schedule, continuing for as long as the schedule continues.

```ts
export declare const fromSchedule: <S, R, A>(schedule: Schedule<S, R, unknown, A>) => Stream<R, never, A>;
```

### fromTQueue

Creates a stream from a `TQueue` of values.

```ts
export declare const fromTQueue: <A>(queue: TQueue<A>) => Stream<never, never, A>;
```

### groupAdjacentBy

Creates a stream that groups on adjacent keys, calculated by function f.

```ts
export declare const groupAdjacentBy: <A, K>(f: (a: A) => K) => <R, E>(self: Stream<R, E, A>) => Stream<R, E, readonly [K, Chunk<A>]>;
```

### groupBy

More powerful version of `Stream.groupByKey`.

```ts
export declare const groupBy: <A, R2, E2, K, V>(f: (a: A) => Effect<R2, E2, readonly [K, V]>, buffer?: number) => <R, E>(self: Stream<R, E, A>) => GroupBy<R2 | R, E2 | E, K, V, A>;
```

### groupByKey

Partition a stream using a function and process each stream individually.
This returns a data structure that can be used to further filter down which
groups shall be processed.

After calling apply on the GroupBy object, the remaining groups will be
processed in parallel and the resulting streams merged in a
nondeterministic fashion.

Up to `buffer` elements may be buffered in any group stream before the
producer is backpressured. Take care to consume from all streams in order
to prevent deadlocks.

```ts
export declare const groupByKey: <A, K>(f: (a: A) => K, buffer?: number) => <R, E>(self: Stream<R, E, A>) => GroupBy<R, E, K, A, A>;
```

### grouped

Partitions the stream with specified chunkSize

```ts
export declare const grouped: (chunkSize: number) => <R, E, A>(self: Stream<R, E, A>) => Stream<R, E, Chunk<A>>;
```

### groupedWithin

Partitions the stream with the specified chunkSize or until the specified
duration has passed, whichever is satisfied first.

```ts
export declare const groupedWithin: (chunkSize: number, within: Duration) => <R, E, A>(self: Stream<R, E, A>) => Stream<R, E, Chunk<A>>;
```

### haltAfter

Specialized version of haltWhen which halts the evaluation of this stream
after the given duration.

An element in the process of being pulled will not be interrupted when the
given duration completes. See `interruptAfter` for this behavior.

```ts
export declare const haltAfter: (duration: Duration) => <R, E, A>(self: Stream<R, E, A>) => Stream<R, E, A>;
```

### haltWhen

Halts the evaluation of this stream when the provided IO completes. The
given IO will be forked as part of the returned stream, and its success
will be discarded.

An element in the process of being pulled will not be interrupted when the
IO completes. See `interruptWhen` for this behavior.

If the IO completes with a failure, the stream will emit that failure.

```ts
export declare const haltWhen: <R2, E2, Z>(io: Effect<R2, E2, Z>) => <R, E, A>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, A>;
```

### haltWhenDeferred

Halts the evaluation of this stream when the provided deferred resolves.

If the deferred completes with a failure, the stream will emit that failure.

```ts
export declare const haltWhenDeferred: <E2, Z>(deferred: Deferred<E2, Z>) => <R, E, A>(self: Stream<R, E, A>) => Stream<R, E2 | E, A>;
```

### interleave

Interleaves this stream and the specified stream deterministically by
alternating pulling values from this stream and the specified stream. When
one stream is exhausted all remaining values in the other stream will be
pulled.

```ts
export declare const interleave: <R2, E2, A2>(that: Stream<R2, E2, A2>) => <R, E, A>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, A2 | A>;
```

### interleaveWith

Combines this stream and the specified stream deterministically using the
stream of boolean values `b` to control which stream to pull from next.
`true` indicates to pull from this stream and `false` indicates to pull
from the specified stream. Only consumes as many elements as requested by
`b`. If either this stream or the specified stream are exhausted further
requests for values from that stream will be ignored.

```ts
export declare const interleaveWith: <R2, E2, A2, R3, E3>(that: Stream<R2, E2, A2>, b: Stream<R3, E3, boolean>) => <R, E, A>(self: Stream<R, E, A>) => Stream<R2 | R3 | R, E2 | E3 | E, A2 | A>;
```

### interruptAfter

Specialized version of interruptWhen which interrupts the evaluation of
this stream after the given duration.

```ts
export declare const interruptAfter: (duration: Duration) => <R, E, A>(self: Stream<R, E, A>) => Stream<R, E, A>;
```

### interruptWhen

Interrupts the evaluation of this stream when the provided effect completes.
The given effect will be forked as part of this stream, and its success will
be discarded. This combinator will also interrupt any in-progress element
being pulled from upstream.

If the effect completes with a failure before the stream completes, the
returned stream will emit that failure.

```ts
export declare const interruptWhen: <R2, E2, Z>(effect: Effect<R2, E2, Z>) => <R, E, A>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, A>;
```

### interruptWhenDeferred

Interrupts the evaluation of this stream when the provided deferred
resolves. This combinator will also interrupt any in-progress element being
pulled from upstream.

If the deferred completes with a failure, the stream will emit that failure.

```ts
export declare const interruptWhenDeferred: <E2, Z>(promise: Deferred<E2, Z>) => <R, E, A>(self: Stream<R, E, A>) => Stream<R, E2 | E, A>;
```

### intersperse

Intersperse stream with provided element.

```ts
export declare const intersperse: <A2>(middle: A2) => <R, E, A>(self: Stream<R, E, A>) => Stream<R, E, A2 | A>;
```

### intersperseAffixes

Intersperse and also add a prefix and a suffix.

```ts
export declare const intersperseAffixes: <A2>(start: A2, middle: A2, end: A2) => <R, E, A>(self: Stream<R, E, A>) => Stream<R, E, A2 | A>;
```

### isStream

Determines if the provided `unknown` value is a `Stream`.

```ts
export declare const isStream: (u: unknown) => u is Stream<unknown, unknown, unknown>;
```

### isStreamTimeoutError

```ts
export declare const isStreamTimeoutError: (u: unknown) => u is StreamTimeoutError;
```

### iso_8859_1Decode

```ts
export declare const iso_8859_1Decode: <R, E>(self: Stream<R, E, number>) => Stream<R, E, string>;
```

### iterate

Returns an infinite stream of iterative function application: `a`, `f(a)`,
`f(f(a))`, `f(f(f(a)))`, ...

```ts
export declare const iterate: <A>(a: A, f: (a: A) => A) => Stream<never, never, A>;
```

### left

Fails with the error `None` if value is `Right`.

```ts
export declare const left: <R, E, A1, A2>(self: Stream<R, E, Either<A1, A2>>) => Stream<R, Maybe<E>, A2>;
```

### leftOrFail

Fails with given error 'e' if value is `Right`.

```ts
export declare const leftOrFail: <E2>(e: LazyArg<E2>) => <R, E, A, A2>(self: Stream<R, E, Either<A, A2>>) => Stream<R, E2 | E, A>;
```

### log

Logs the specified message at the current log level.

```ts
export declare const log: (message: string) => Stream<never, never, void>;
```

### logAnnotate

Annotates each log in streams composed after this with the specified log
annotation.

```ts
export declare const logAnnotate: (key: string, value: string) => Stream<never, never, void>;
```

### logAnnotations

Retrieves the log annotations associated with the current scope.

```ts
export declare const logAnnotations: () => Stream<never, never, ImmutableMap<string, string>>;
```

### logDebug

Logs the specified message at the debug log level.

```ts
export declare const logDebug: (message: string) => Stream<never, never, void>;
```

### logError

Logs the specified message at the error log level.

```ts
export declare const logError: (message: string) => Stream<never, never, void>;
```

### logErrorCause

Logs the specified cause as an error.

```ts
export declare const logErrorCause: <E>(cause: Cause<E>) => Stream<never, never, void>;
```

### logFatal

Logs the specified message at the fatal log level.

```ts
export declare const logFatal: (message: string) => Stream<never, never, void>;
```

### logInfo

Logs the specified message at the informational log level.

```ts
export declare const logInfo: (message: string) => Stream<never, never, void>;
```

### logLevel

Sets the log level for streams composed after this.

```ts
export declare const logLevel: (level: LogLevel) => Stream<never, never, void>;
```

### logSpan

Adjusts the label for the logging span for streams composed after this.

```ts
export declare const logSpan: (label: string) => Stream<never, never, void>;
```

### logTrace

Logs the specified message at the trace log level.

```ts
export declare const logTrace: (message: string) => Stream<never, never, void>;
```

### logWarning

Logs the specified message at the warning log level.

```ts
export declare const logWarning: (message: string) => Stream<never, never, void>;
```

### make

Creates a pure stream from a variable list of values

```ts
export declare const make: <A>(...as: A[]) => Stream<never, never, A>;
```

### map

Transforms the elements of this stream using the supplied function.

```ts
export declare const map: <A, B>(f: (a: A) => B) => <R, E>(self: Stream<R, E, A>) => Stream<R, E, B>;
```

### mapAccum

Statefully maps over the elements of this stream to produce new elements.

```ts
export declare const mapAccum: <A, S, A1>(s: S, f: (s: S, a: A) => readonly [S, A1]) => <R, E>(self: Stream<R, E, A>) => Stream<R, E, A1>;
```

### mapAccumEffect

Statefully and effectfully maps over the elements of this stream to produce
new elements.

```ts
export declare const mapAccumEffect: <A, R2, E2, A2, S>(s: S, f: (s: S, a: A) => Effect<R2, E2, readonly [S, A2]>) => <R, E>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, A2>;
```

### mapBoth

Returns a stream whose failure and success channels have been mapped by the
specified pair of functions, `f` and `g`.

```ts
export declare const mapBoth: <E, E2, A, A2>(f: (e: E) => E2, g: (a: A) => A2) => <R>(self: Stream<R, E, A>) => Stream<R, E2, A2>;
```

### mapChunks

Transforms the chunks emitted by this stream.

```ts
export declare const mapChunks: <A, A2>(f: (chunk: Chunk<A>) => Chunk<A2>) => <R, E>(self: Stream<R, E, A>) => Stream<R, E, A2>;
```

### mapChunksEffect

Effectfully transforms the chunks emitted by this stream.

```ts
export declare const mapChunksEffect: <A, R2, E2, A2>(f: (chunk: Chunk<A>) => Effect<R2, E2, Chunk<A2>>) => <R, E>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, A2>;
```

### mapConcat

Maps each element to an Collection, and flattens the Collections into the
output of this stream.

```ts
export declare const mapConcat: <A, A2>(f: (a: A) => Collection<A2>) => <R, E>(self: Stream<R, E, A>) => Stream<R, E, A2>;
```

### mapConcatEffect

Effectfully maps each element to an Collection, and flattens the Collections
into the output of this stream.

```ts
export declare const mapConcatEffect: <A, R2, E2, A2>(f: (a: A) => Effect<R2, E2, Collection<A2>>) => <R, E>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, A2>;
```

### mapEffect

Maps over elements of the stream with the specified effectful function.

```ts
export declare const mapEffect: <A, R1, E1, B>(f: (a: A) => Effect<R1, E1, B>) => <R, E>(self: Stream<R, E, A>) => Stream<R1 | R, E1 | E, B>;
```

### mapEffectPar

Maps over elements of the stream with the specified effectful function,
executing up to `n` invocations of `f` concurrently. Transformed elements
will be emitted in the original order.

```ts
export declare const mapEffectPar: <A, R1, E1, B>(n: number, f: (a: A) => Effect<R1, E1, B>) => <R, E>(self: Stream<R, E, A>) => Stream<R1 | R, E1 | E, B>;
```

### mapEffectParUnordered

Maps over elements of the stream with the specified effectful function,
executing up to `n` invocations of `f` concurrently. The element order is
not enforced by this combinator, and elements may be reordered.

```ts
export declare const mapEffectParUnordered: <A, R1, E1, B>(n: number, f: (a: A) => Effect<R1, E1, B>) => <R, E>(self: Stream<R, E, A>) => Stream<R1 | R, E1 | E, B>;
```

### mapEffectPartitioned

Maps over elements of the stream with the specified effectful function,
partitioned by `p` executing invocations of `f` concurrently. The number of
concurrent invocations of `f` is determined by the number of different
outputs of type `K`. Up to `buffer` elements may be buffered per partition.
Transformed elements may be reordered but the order within a partition is
maintained.

```ts
export declare const mapEffectPartitioned: <A, R2, E2, A2, K>(keyBy: (a: A) => K, f: (a: A) => Effect<R2, E2, A2>, buffer?: number) => <R, E>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, A2>;
```

### mapError

Transforms the errors emitted by this stream using `f`.

```ts
export declare const mapError: <E, E2>(f: (e: E) => E2) => <R, A>(self: Stream<R, E, A>) => Stream<R, E2, A>;
```

### mapErrorCause

Transforms the full causes of failures emitted by this stream.

```ts
export declare const mapErrorCause: <E, E2>(f: (e: Cause<E>) => Cause<E2>) => <R, A>(self: Stream<R, E, A>) => Stream<R, E2, A>;
```

### merge

Merges this stream and the specified stream together.

New produced stream will terminate when both specified stream terminate if
no termination strategy is specified.

```ts
export declare const merge: <R2, E2, A2>(that: Stream<R2, E2, A2>, strategy?: TerminationStrategy) => <R, E, A>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, A2 | A>;
```

### mergeAll

Merges a variable list of streams in a non-deterministic fashion. Up to `n`
streams may be consumed in parallel and up to `outputBuffer` chunks may be
buffered by this operator.

```ts
export declare const mergeAll: (n: number, outputBuffer?: number) => <R, E, A>(...streams: Stream<R, E, A>[]) => Stream<R, E, A>;
```

### mergeAllUnbounded

Like `mergeAll`, but runs all streams concurrently.

```ts
export declare const mergeAllUnbounded: (outputBuffer?: number) => <R, E, A>(...streams: Stream<R, E, A>[]) => Stream<R, E, A>;
```

### mergeEither

Merges this stream and the specified stream together to produce a stream of
eithers.

```ts
export declare const mergeEither: <R2, E2, A2>(that: Stream<R2, E2, A2>, strategy?: TerminationStrategy) => <R, E, A>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, Either<A, A2>>;
```

### mergeLeft

Merges this stream and the specified stream together, discarding the values
from the right stream.

```ts
export declare const mergeLeft: <R2, E2, A2>(that: Stream<R2, E2, A2>, strategy?: TerminationStrategy) => <R, E, A>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, A>;
```

### mergeRight

Merges this stream and the specified stream together, discarding the values
from the left stream.

```ts
export declare const mergeRight: <R2, E2, A2>(that: Stream<R2, E2, A2>, strategy?: TerminationStrategy) => <R, E, A>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, A2>;
```

### mergeTerminateEither

Merges this stream and the specified stream together. New produced stream
will terminate when either stream terminates.

```ts
export declare const mergeTerminateEither: <R2, E2, A2>(that: Stream<R2, E2, A2>) => <R, E, A>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, A2 | A>;
```

### mergeTerminateLeft

Merges this stream and the specified stream together. New produced stream
will terminate when this stream terminates.

```ts
export declare const mergeTerminateLeft: <R2, E2, A2>(that: Stream<R2, E2, A2>) => <R, E, A>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, A2 | A>;
```

### mergeTerminateRight

Merges this stream and the specified stream together. New produced stream
will terminate when the specified stream terminates.

```ts
export declare const mergeTerminateRight: <R2, E2, A2>(that: Stream<R2, E2, A2>) => <R, E, A>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, A2 | A>;
```

### mergeWith

Merges this stream and the specified stream together to a common element
type with the specified mapping functions.

New produced stream will terminate when both specified stream terminate if
no termination strategy is specified.

```ts
export declare const mergeWith: <R2, E2, A, A2, A3>(that: Stream<R2, E2, A2>, left: (a: A) => A3, right: (a2: A2) => A3, strategy?: TerminationStrategy) => <R, E>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, A3>;
```

### mkString

Returns a combined string resulting from concatenating each of the values
from the stream.

```ts
export declare const mkString: <R, E, A>(self: Stream<R, E, A>) => Effect<R, E, string>;
```

### mkStringAffixes

Returns a combined string resulting from concatenating each of the values
from the stream beginning with `before` interspersed with `middle` and
ending with `after`.

```ts
export declare const mkStringAffixes: (start: string, middle: string, end: string) => <R, E, A>(self: Stream<R, E, A>) => Effect<R, E, string>;
```

### never

Returns a stream that never produces any value or fails with any error.

```ts
export declare const never: Stream<never, never, never>;
```

### onError

Runs the specified effect if this stream fails, providing the error to the
effect if it exists.

Note: Unlike `Effect.onError`, there is no guarantee that the provided
effect will not be interrupted.

```ts
export declare const onError: <E, R2, Z>(cleanup: (cause: Cause<E>) => Effect<R2, never, Z>) => <R, A>(self: Stream<R, E, A>) => Stream<R2 | R, E, A>;
```

### orElse

Switches to the provided stream in case this one fails with a typed error.

See also `Stream.catchAll`.

```ts
export declare const orElse: <R2, E2, A2>(that: LazyArg<Stream<R2, E2, A2>>) => <R, E, A>(self: Stream<R, E, A>) => Stream<R2 | R, E2, A2 | A>;
```

### orElseEither

Switches to the provided stream in case this one fails with a typed error.

See also `Stream.catchAll`.

```ts
export declare const orElseEither: <R2, E2, A2>(that: LazyArg<Stream<R2, E2, A2>>) => <R, E, A>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, Either<A, A2>>;
```

### orElseFail

Fails with given error in case this one fails with a typed error.

See also `Stream.catchAll`.

```ts
export declare const orElseFail: <E2>(e: LazyArg<E2>) => <R, E, A>(self: Stream<R, E, A>) => Stream<R, E2, A>;
```

### orElseOptional

Switches to the provided stream in case this one fails with the `None`
value.

See also `Stream.catchAll`.

```ts
export declare const orElseOptional: <R2, E2, A2>(that: LazyArg<Stream<R2, Maybe<E2>, A2>>) => <R, E, A>(self: Stream<R, Maybe<E>, A>) => Stream<R2 | R, Maybe<E2 | E>, A2 | A>;
```

### orElseSucceed

Succeeds with the specified value if this one fails with a typed error.

```ts
export declare const orElseSucceed: <A2>(a: LazyArg<A2>) => <R, E, A>(self: Stream<R, E, A>) => Stream<R, never, A2 | A>;
```

### paginate

Like `unfold`, but allows the emission of values to end one step further than
the unfolding of the state. This is useful for embedding paginated APIs,
hence the name.

```ts
export declare const paginate: <S, A>(s: S, f: (s: S) => readonly [A, Maybe<S>]) => Stream<never, never, A>;
```

### paginateChunk

Like `unfoldChunk`, but allows the emission of values to end one step
further than the unfolding of the state. This is useful for embedding
paginated APIs, hence the name.

```ts
export declare const paginateChunk: <S, A>(s: S, f: (s: S) => readonly [Chunk<A>, Maybe<S>]) => Stream<never, never, A>;
```

### paginateChunkEffect

Like `unfoldChunkEffect`, but allows the emission of values to end one step
further than the unfolding of the state. This is useful for embedding
paginated APIs, hence the name.

```ts
export declare const paginateChunkEffect: <S, R, E, A>(s: S, f: (s: S) => Effect<R, E, readonly [Chunk<A>, Maybe<S>]>) => Stream<R, E, A>;
```

### paginateEffect

Like `unfoldEffect`, but allows the emission of values to end one step
further than the unfolding of the state. This is useful for embedding
paginated APIs, hence the name.

```ts
export declare const paginateEffect: <S, R, E, A>(s: S, f: (s: S) => Effect<R, E, readonly [A, Maybe<S>]>) => Stream<R, E, A>;
```

### partition

Partition a stream using a predicate. The first stream will contain all
element evaluated to true and the second one will contain all element
evaluated to false. The faster stream may advance by up to buffer elements
further than the slower one.

```ts
export declare const partition: <A>(p: Predicate<A>, buffer?: number) => <R, E>(self: Stream<R, E, A>) => Effect<Scope | R, E, readonly [Stream<never, E, A>, Stream<never, E, A>]>;
```

### partitionEither

Split a stream by a predicate. The faster stream may advance by up to
buffer elements further than the slower one.

```ts
export declare const partitionEither: <A, R2, E2, A2, A3>(p: (a: A) => Effect<R2, E2, Either<A2, A3>>, buffer?: number) => <R, E>(self: Stream<R, E, A>) => Effect<Scope | R2 | R, E2 | E, readonly [Stream<never, E2 | E, A2>, Stream<never, E2 | E, A3>]>;
```

### peel

Peels off enough material from the stream to construct a `Z` using the
provided `Sink` and then returns both the `Z` and the rest of the
`Stream` in a scope. Like all scoped values, the provided stream is valid
only within the scope.

```ts
export declare const peel: <R2, E2, A2, Z>(sink: Sink<R2, E2, A2, A2, Z>) => <R, E extends E2, A extends A2>(self: Stream<R, E, A>) => Effect<Scope | R2 | R, E2 | E, readonly [Z, Stream<never, E, A2>]>;
```

### pipeThrough

Pipes all of the values from this stream through the provided sink.

```ts
export declare const pipeThrough: <A, R2, E2, L, Z>(sink: Sink<R2, E2, A, L, Z>) => <R, E>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, L>;
```

### pipeThroughChannel

Pipes all the values from this stream through the provided channel.

```ts
export declare const pipeThroughChannel: <E, A, R2, E2, A2>(channel: Channel<R2, E, Chunk<A>, unknown, E2, Chunk<A2>, unknown>) => <R>(self: Stream<R, E, A>) => Stream<R2 | R, E | E2, A2>;
```

### pipeThroughChannelFail

Pipes all values from this stream through the provided channel, passing
through any error emitted by this stream unchanged.

```ts
export declare const pipeThroughChannelFail: <E, A, R2, E2, A2>(channel: Channel<R2, E, Chunk<A>, unknown, E2, Chunk<A2>, unknown>) => <R>(self: Stream<R, E, A>) => Stream<R2 | R, E | E2, A2>;
```

### prepend

Emits the provided chunk before emitting any other value.

```ts
export declare const prepend: <A2>(values: Chunk<A2>) => <R, E, A>(stream: Stream<R, E, A>) => Stream<R, E, A2 | A>;
```

### provideEnvironment

Provides the stream with its required environment, which eliminates its
dependency on `R`.

```ts
export declare const provideEnvironment: <R>(env: Env<R>) => <E, A>(self: Stream<R, E, A>) => Stream<never, E, A>;
```

### provideLayer

Provides a layer to the stream, which translates it to another level.

```ts
export declare const provideLayer: <R, E, A>(layer: Layer<R, E, A>) => <E1, A1>(self: Stream<A, E1, A1>) => Stream<R, E | E1, A1>;
```

### provideService

Provides the stream with the single service it requires. If the stream
requires multiple services use `provideEnvironment` instead.

```ts
export declare const provideService: <T, T1 extends T>(tag: Tag<T>, service: T1) => <R, E, A>(self: Stream<R, E, A>) => Stream<Exclude<R, T>, E, A>;
```

### provideSomeEnvironment

Transforms the environment being provided to the stream with the specified
function.

```ts
export declare const provideSomeEnvironment: <R0, R>(f: (r0: Env<R0>) => Env<R>) => <E, A>(self: Stream<R, E, A>) => Stream<R0, E, A>;
```

### provideSomeLayer

Splits the environment into two parts, providing one part using the
specified layer and leaving the remainder.

```ts
export declare const provideSomeLayer: <R, E, A, R1, E1, A1>(layer: Layer<R1, E1, A1>) => <R_1, E_1, A_1>(self: Stream<R_1, E_1, A_1>) => Stream<R1 | Exclude<R_1, A1>, E1 | E_1, A_1>;
```

### range

Constructs a stream from a range of integers (lower bound included, upper
bound not included).

```ts
export declare const range: (min: number, max: number, chunkSize?: number) => Stream<never, never, number>;
```

### rechunk

Re-chunks the elements of the stream into chunks of `n` elements each. The
last chunk might contain less than `n` elements.

```ts
export declare const rechunk: (n: number) => <R, E, A>(self: Stream<R, E, A>) => Stream<R, E, A>;
```

### refineOrDie

Keeps some of the errors, and terminates the fiber with the rest.

```ts
export declare const refineOrDie: <E, E2>(pf: (e: E) => Maybe<E2>) => <R, A>(self: Stream<R, E, A>) => Stream<R, E2, A>;
```

### refineOrDieWith

Keeps some of the errors, and terminates the fiber with the rest, using the
specified function to convert the `E` into a `Throwable`.

```ts
export declare const refineOrDieWith: <E, E2>(pf: (e: E) => Maybe<E2>, f: (e: E) => unknown) => <R, A>(self: Stream<R, E, A>) => Stream<R, E2, A>;
```

### repeat

Repeats the provided value infinitely.

```ts
export declare const repeat: <A>(a: A) => Stream<never, never, A>;
```

### repeatEffect

Creates a stream from an effect producing a value of type `A` which repeats
forever.

```ts
export declare const repeatEffect: <R, E, A>(effect: Effect<R, E, A>) => Stream<R, E, A>;
```

### repeatEffectChunk

Creates a stream from an effect producing chunks of `A` values which
repeats forever.

```ts
export declare const repeatEffectChunk: <R, E, A>(effect: Effect<R, E, Chunk<A>>) => Stream<R, E, A>;
```

### repeatEffectChunkMaybe

Creates a stream from an effect producing chunks of `A` values until it
fails with `None`.

```ts
export declare const repeatEffectChunkMaybe: <R, E, A>(effect: Effect<R, Maybe<E>, Chunk<A>>) => Stream<R, E, A>;
```

### repeatEffectMaybe

Creates a stream from an effect producing values of type `A` until it fails
with `None`.

```ts
export declare const repeatEffectMaybe: <R, E, A>(effect: Effect<R, Maybe<E>, A>) => Stream<R, E, A>;
```

### repeatEffectWithSchedule

Creates a stream from an effect producing a value of type `A`, which is
repeated using the specified schedule.

```ts
export declare const repeatEffectWithSchedule: <S, R, E, A>(effect: Effect<R, E, A>, schedule: Schedule<S, R, A, unknown>) => Stream<R, E, A>;
```

### repeatEither

Repeats the entire stream using the specified schedule. The stream will
execute normally, and then repeat again according to the provided schedule.
The schedule output will be emitted at the end of each repetition.

```ts
export declare const repeatEither: <S, R2, B>(schedule: Schedule<S, R2, unknown, B>) => <R, E, A>(self: Stream<R, E, A>) => Stream<R2 | R, E, Either<B, A>>;
```

### repeatElements

Repeats each element of the stream using the provided schedule. Repetitions
are done in addition to the first execution, which means using
`Schedule.recurs(1)` actually results in the original effect, plus an
additional recurrence, for a total of two repetitions of each value in the
stream.

```ts
export declare const repeatElements: <S, R2, B>(schedule: Schedule<S, R2, unknown, B>) => <R, E, A>(self: Stream<R, E, A>) => Stream<R2 | R, E, A>;
```

### repeatElementsEither

Repeats each element of the stream using the provided schedule. When the
schedule is finished, then the output of the schedule will be emitted into
the stream. Repetitions are done in addition to the first execution, which
means using `Schedule.recurs(1)` actually results in the original effect,
plus an additional recurrence, for a total of two repetitions of each value
in the stream.

```ts
export declare const repeatElementsEither: <S, R2, B>(schedule: Schedule<S, R2, unknown, B>) => <R, E, A>(self: Stream<R, E, A>) => Stream<R2 | R, E, Either<B, A>>;
```

### repeatElementsWith

Repeats each element of the stream using the provided schedule. When the
schedule is finished, then the output of the schedule will be emitted into
the stream. Repetitions are done in addition to the first execution, which
means using `Schedule.recurs(1)` actually results in the original effect,
plus an additional recurrence, for a total of two repetitions of each value
in the stream.

This function accepts two conversion functions, which allow the output of
this stream and the output of the provided schedule to be unified into a
single type. For example, `Either` or similar data type.

```ts
export declare const repeatElementsWith: <A, S, R2, B, C1, C2>(schedule: Schedule<S, R2, unknown, B>, f: (a: A) => C1, g: (b: B) => C2) => <R, E>(self: Stream<R, E, A>) => Stream<R2 | R, E, C1 | C2>;
```

### repeatNow

Repeats the entire stream using the specified schedule. The stream will
execute normally, and then repeat again according to the provided schedule.

```ts
export declare const repeatNow: <S, R2, B>(schedule: Schedule<S, R2, unknown, B>) => <R, E, A>(self: Stream<R, E, A>) => Stream<R2 | R, E, A>;
```

### repeatWith

Repeats the entire stream using the specified schedule. The stream will
execute normally, and then repeat again according to the provided schedule.
The schedule output will be emitted at the end of each repetition and can
be unified with the stream elements using the provided functions.

```ts
export declare const repeatWith: <A, S, R2, B, C1, C2>(schedule: Schedule<S, R2, unknown, B>, f: (a: A) => C1, g: (b: B) => C2) => <R, E>(self: Stream<R, E, A>) => Stream<R2 | R, E, C1 | C2>;
```

### repeatWithSchedule

Repeats the value using the provided schedule.

```ts
export declare const repeatWithSchedule: <S, R, A>(a: A, schedule: Schedule<S, R, A, unknown>) => Stream<R, never, A>;
```

### retry

When the stream fails, retry it according to the given schedule

This retries the entire stream, so will re-execute all of the stream's
acquire operations.

The schedule is reset as soon as the first element passes through the
stream again.

```ts
export declare const retry: <E, S, R2, Z>(schedule: Schedule<S, R2, E, Z>) => <R, A>(self: Stream<R, E, A>) => Stream<R2 | R, E, A>;
```

### right

Fails with the error `None` if value is `Left`.

```ts
export declare const right: <R, E, A1, A2>(self: Stream<R, E, Either<A1, A2>>) => Stream<R, Maybe<E>, A2>;
```

### rightOrFail

Fails with given error 'e' if value is `Left`.

```ts
export declare const rightOrFail: <R, E, E2, A1, A2>(error: LazyArg<E2>) => (self: Stream<R, E, Either<A1, A2>>) => Stream<R, E | E2, A2>;
```

### run

Runs the sink on the stream to produce either the sink's result or an
error.

```ts
export declare const run: <A, R2, E2, Z>(sink: Sink<R2, E2, A, unknown, Z>) => <R, E>(self: Stream<R, E, A>) => Effect<R2 | R, E2 | E, Z>;
```

### runCollect

Runs the stream and collects all of its elements to a chunk.

```ts
export declare const runCollect: <R, E, A>(self: Stream<R, E, A>) => Effect<R, E, Chunk<A>>;
```

### runCount

Runs the stream and emits the number of elements processed.

```ts
export declare const runCount: <R, E, A>(self: Stream<R, E, A>) => Effect<R, E, number>;
```

### runDrain

Runs the stream only for its effects. The emitted elements are discarded.

```ts
export declare const runDrain: <R, E, A>(self: Stream<R, E, A>) => Effect<R, E, void>;
```

### runFold

Executes a pure fold over the stream of values - reduces all elements in
the stream to a value of type `S`.

```ts
export declare const runFold: <S, A>(s: S, f: (s: S, a: A) => S) => <R, E>(self: Stream<R, E, A>) => Effect<R, E, S>;
```

### runFoldEffect

Executes a pure fold over the stream of values - reduces all elements in
the stream to a value of type `S`.

```ts
export declare const runFoldEffect: <S, A, R2, E2>(s: S, f: (s: S, a: A) => Effect<R2, E2, S>) => <R, E>(self: Stream<R, E, A>) => Effect<R2 | R, E2 | E, S>;
```

### runFoldScoped

Executes a pure fold over the stream of values. Returns a scoped value
that represents the scope of the stream.

```ts
export declare const runFoldScoped: <S, A>(s: S, f: (s: S, a: A) => S) => <R, E>(self: Stream<R, E, A>) => Effect<Scope | R, E, S>;
```

### runFoldScopedEffect

Executes an effectful fold over the stream of values. Returns a scoped
value that represents the scope of the stream.

```ts
export declare const runFoldScopedEffect: <S, A, R2, E2>(s: S, f: (s: S, a: A) => Effect<R2, E2, S>) => <R, E>(self: Stream<R, E, A>) => Effect<Scope | R2 | R, E2 | E, S>;
```

### runFoldWhile

Reduces the elements in the stream to a value of type `S`. Stops the fold
early when the condition is not fulfilled.

```ts
export declare const runFoldWhile: <S, A>(s: S, cont: Predicate<S>, f: (s: S, a: A) => S) => <R, E>(self: Stream<R, E, A>) => Effect<R, E, S>;
```

### runFoldWhileEffect

Reduces the elements in the stream to a value of type `S`. Stops the fold
early when the condition is not fulfilled.

```ts
export declare const runFoldWhileEffect: <S, A, R2, E2>(s: S, cont: Predicate<S>, f: (s: S, a: A) => Effect<R2, E2, S>) => <R, E>(self: Stream<R, E, A>) => Effect<R2 | R, E2 | E, S>;
```

### runFoldWhileScoped

Executes a pure fold over the stream of values. Returns a scoped value
that represents the scope of the stream. Stops the fold early when the
condition is not fulfilled.

```ts
export declare const runFoldWhileScoped: <S, A>(s: S, cont: Predicate<S>, f: (s: S, a: A) => S) => <R, E>(self: Stream<R, E, A>) => Effect<Scope | R, E, S>;
```

### runFoldWhileScopedEffect

Executes an effectful fold over the stream of values. Returns a scoped
value that represents the scope of the stream. Stops the fold early when
the condition is not fulfilled.

```ts
export declare const runFoldWhileScopedEffect: <S, A, R2, E2>(s: S, cont: Predicate<S>, f: (s: S, a: A) => Effect<R2, E2, S>) => <R, E>(self: Stream<R, E, A>) => Effect<Scope | R2 | R, E2 | E, S>;
```

### runForEach

Consumes all elements of the stream, passing them to the specified
callback.

```ts
export declare const runForEach: <R, E, A, R2, E2, Z>(f: (a: A) => Effect<R2, E2, Z>) => <R_1, E_1>(self: Stream<R_1, E_1, A>) => Effect<R2 | R_1, E2 | E_1, void>;
```

### runForEachChunk

Consumes all elements of the stream, passing them to the specified
callback.

```ts
export declare const runForEachChunk: <A, R2, E2, Z>(f: (chunk: Chunk<A>) => Effect<R2, E2, Z>) => <R, E>(self: Stream<R, E, A>) => Effect<R2 | R, E2 | E, void>;
```

### runForEachChunkScoped

Like `Stream.runForEachChunk`, but returns a scoped `Effect` so the
finalization order can be controlled.

```ts
export declare const runForEachChunkScoped: <A, R2, E2, Z>(f: (chunk: Chunk<A>) => Effect<R2, E2, Z>) => <R, E>(self: Stream<R, E, A>) => Effect<Scope | R2 | R, E2 | E, void>;
```

### runForEachScoped

Like `Stream.forEach`, but returns an `Effect` so the finalization
order can be controlled.

```ts
export declare const runForEachScoped: <A, R1, E1, Z>(f: (a: A) => Effect<R1, E1, Z>) => <R, E>(self: Stream<R, E, A>) => Effect<Scope | R1 | R, E1 | E, void>;
```

### runForEachWhile

Consumes elements of the stream, passing them to the specified callback,
and terminating consumption when the callback returns `false`.

```ts
export declare const runForEachWhile: <A, R2, E2, Z>(f: (a: A) => Effect<R2, E2, boolean>) => <R, E>(self: Stream<R, E, A>) => Effect<R2 | R, E2 | E, void>;
```

### runForEachWhileScoped

Like `Stream.runForEachWhile`, but returns a scoped `Effect` so the
finalization order can be controlled.

```ts
export declare const runForEachWhileScoped: <A, R2, E2, Z>(f: (a: A) => Effect<R2, E2, boolean>) => <R, E>(self: Stream<R, E, A>) => Effect<Scope | R2 | R, E2 | E, void>;
```

### runHead

Runs the stream to completion and yields the first value emitted by it,
discarding the rest of the elements.

```ts
export declare const runHead: <R, E, A>(self: Stream<R, E, A>) => Effect<R, E, Maybe<A>>;
```

### runIntoHub

Publishes elements of this stream to a hub. Stream failure and ending will
also be signalled.

```ts
export declare const runIntoHub: <E1, A>(hub: Hub<Take<E1, A>>) => <R, E extends E1>(self: Stream<R, E, A>) => Effect<R, E1 | E, void>;
```

### runIntoHubScoped

Like `Stream.runIntoHub`, but provides the result as a scoped effect to
allow for scope composition.

```ts
export declare const runIntoHubScoped: <E1, A>(hub: Hub<Take<E1, A>>) => <R, E extends E1>(self: Stream<R, E, A>) => Effect<Scope | R, E1 | E, void>;
```

### runIntoQueue

Enqueues elements of this stream into a queue. Stream failure and ending
will also be signalled.

```ts
export declare const runIntoQueue: <E1, A>(queue: Enqueue<Take<E1, A>>) => <R, E extends E1>(self: Stream<R, E, A>) => Effect<R, E1 | E, void>;
```

### runIntoQueueElementsScoped

Like `Stream.runIntoQueue`, but provides the result as a scoped effect to
allow for scope composition.

```ts
export declare const runIntoQueueElementsScoped: <E1, A>(queue: Enqueue<Exit<Maybe<E1>, A>>) => <R, E extends E1>(self: Stream<R, E, A>) => Effect<Scope | R, E1 | E, void>;
```

### runIntoQueueScoped

Like `Stream.runIntoQueue`, but provides the result as a scoped effect to
allow for scope composition.

```ts
export declare const runIntoQueueScoped: <E1, A>(queue: Enqueue<Take<E1, A>>) => <R, E extends E1>(self: Stream<R, E, A>) => Effect<Scope | R, E1 | E, void>;
```

### runLast

Runs the stream to completion and yields the last value emitted by it,
discarding the rest of the elements.

```ts
export declare const runLast: <R, E, A>(self: Stream<R, E, A>) => Effect<R, E, Maybe<A>>;
```

### runScoped

```ts
export declare const runScoped: <A, R2, E2, B>(sink: Sink<R2, E2, A, unknown, B>) => <R, E>(self: Stream<R, E, A>) => Effect<Scope | R2 | R, E2 | E, B>;
```

### runSum

Runs the stream to a sink which sums elements, provided they are numbers.

```ts
export declare const runSum: <R, E, A>(self: Stream<R, E, number>) => Effect<R, E, number>;
```

### scan

Statefully maps over the elements of this stream to produce all
intermediate results of type `S` given an initial S.

```ts
export declare const scan: <S, A>(s: S, f: (s: S, a: A) => S) => <R, E>(self: Stream<R, E, A>) => Stream<R, E, S>;
```

### scanEffect

Statefully and effectfully maps over the elements of this stream to produce
all intermediate results of type `S` given an initial S.

```ts
export declare const scanEffect: <A, S, R2, E2>(s: S, f: (s: S, a: A) => Effect<R2, E2, S>) => <R, E>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, S>;
```

### scanReduce

Statefully maps over the elements of this stream to produce all
intermediate results.

```ts
export declare const scanReduce: <A, A2 extends A>(f: (a2: A2, a: A) => A2) => <R, E>(self: Stream<R, E, A>) => Stream<R, E, A2>;
```

### scanReduceEffect

Statefully and effectfully maps over the elements of this stream to produce
all intermediate results.

```ts
export declare const scanReduceEffect: <A, R2, E2, A2 extends A>(f: (a2: A2, a: A) => Effect<R2, E2, A2>) => <R, E>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, A2>;
```

### schedule

Schedules the output of the stream using the provided `schedule`.

```ts
export declare const schedule: <S, R2, A, B>(schedule: Schedule<S, R2, A, B>) => <R, E>(self: Stream<R, E, A>) => Stream<R2 | R, E, A>;
```

### scheduleEither

Schedules the output of the stream using the provided `schedule` and emits
its output at the end (if `schedule` is finite).

```ts
export declare const scheduleEither: <S, R2, A, B>(schedule: Schedule<S, R2, A, B>) => <R, E>(self: Stream<R, E, A>) => Stream<R2 | R, E, Either<B, A>>;
```

### scheduleWith

Schedules the output of the stream using the provided `schedule` and emits
its output at the end (if `schedule` is finite). Uses the provided function
to align the stream and schedule outputs on the same type.

```ts
export declare const scheduleWith: <S, R2, A, B, C>(schedule: Schedule<S, R2, A, B>, f: (a: A) => C, g: (b: B) => C) => <R, E>(self: Stream<R, E, A>) => Stream<R2 | R, E, C>;
```

### scoped

Creates a single-valued stream from a scoped resource.

```ts
export declare const scoped: <R, E, A>(effect: Effect<R, E, A>) => Stream<Exclude<R, Scope>, E, A>;
```

### service

Accesses the specified service in the environment of the stream.

```ts
export declare const service: <T>(tag: Tag<T>) => Stream<T, never, T>;
```

### serviceWith

Accesses the specified service in the environment of the stream.

```ts
export declare const serviceWith: <T, A>(tag: Tag<T>, f: (resource: T) => A) => Stream<T, never, A>;
```

### serviceWithEffect

Accesses the specified service in the environment of the stream in the
context of an effect.

```ts
export declare const serviceWithEffect: <T, R, E, A>(tag: Tag<T>, f: (resource: T) => Effect<R, E, A>) => Stream<T | R, E, A>;
```

### serviceWithStream

Accesses the specified service in the environment of the stream in the
context of a stream.

```ts
export declare const serviceWithStream: <T, R, E, A>(tag: Tag<T>, f: (resource: T) => Stream<R, E, A>) => Stream<T | R, E, A>;
```

### sliding

Emits a sliding window of `n` elements.

```ts
export declare const sliding: (chunkSize: number, stepSize?: number) => <R, E, A>(self: Stream<R, E, A>) => Stream<R, E, Chunk<A>>;
```

### some

Converts an option on values into an option on errors.

```ts
export declare const some: <R, E, A>(self: Stream<R, E, Maybe<A>>) => Stream<R, Maybe<E>, A>;
```

### someOrElse

Extracts the optional value, or returns the given 'default'.

```ts
export declare const someOrElse: <A2>(def: LazyArg<A2>) => <R, E, A>(self: Stream<R, E, Maybe<A>>) => Stream<R, E, A2 | A>;
```

### someOrFail

Extracts the optional value, or fails with the given error 'e'.

```ts
export declare const someOrFail: <E2>(e: LazyArg<E2>) => <R, E, A>(self: Stream<R, E, Maybe<A>>) => Stream<R, E2 | E, A>;
```

### split

Splits elements based on a predicate.

```ts
export declare const split: <A>(f: Predicate<A>) => <R, E>(self: Stream<R, E, A>) => Stream<R, E, Chunk<A>>;
```

### splitLines

Splits strings on newlines. Handles both Windows newlines (`\r\n`) and UNIX
newlines (`\n`).

```ts
export declare const splitLines: <R, E>(self: Stream<R, E, string>) => Stream<R, E, string>;
```

### splitOn

Splits strings on a delimiter.

```ts
export declare const splitOn: (delimiter: string) => <R, E>(self: Stream<R, E, string>) => Stream<R, E, string>;
```

### splitOnChunk

Splits elements on a delimiter and transforms the splits into desired
output.

```ts
export declare const splitOnChunk: <A>(delimiter: Chunk<A>) => <R, E>(self: Stream<R, E, A>) => Stream<R, E, Chunk<A>>;
```

### splitOnChunkFlatten

Splits elements on a delimiter and transforms the splits into desired
output, flattening the resulting chunks into the stream.

```ts
export declare const splitOnChunkFlatten: <A>(delimiter: Chunk<A>) => <R, E>(self: Stream<R, E, A>) => Stream<R, E, A>;
```

### succeed

Creates a single-valued pure stream.

```ts
export declare const succeed: <A>(a: A) => Stream<never, never, A>;
```

### suspend

Returns a lazily constructed stream.

```ts
export declare const suspend: <R, E, A>(stream: LazyArg<Stream<R, E, A>>) => Stream<R, E, A>;
```

### sync

Creates a single-valued pure stream.

```ts
export declare const sync: <A>(a: LazyArg<A>) => Stream<never, never, A>;
```

### take

Takes the specified number of elements from this stream.

```ts
export declare const take: (n: number) => <R, E, A>(self: Stream<R, E, A>) => Stream<R, E, A>;
```

### takeRight

Takes the last specified number of elements from this stream.

```ts
export declare const takeRight: (n: number) => <R, E, A>(self: Stream<R, E, A>) => Stream<R, E, A>;
```

### takeUntil

Takes all elements of the stream until the specified predicate evaluates to
`true`.

```ts
export declare const takeUntil: <A>(f: Predicate<A>) => <R, E>(self: Stream<R, E, A>) => Stream<R, E, A>;
```

### takeUntilEffect

Takes all elements of the stream until the specified effectual predicate
evaluates to `true`.

```ts
export declare const takeUntilEffect: <A, R2, E2>(f: (a: A) => Effect<R2, E2, boolean>) => <R, E>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, A>;
```

### takeWhile

Creates a pipeline that takes elements while the specified predicate
evaluates to `true`.

```ts
export declare const takeWhile: <A>(f: Predicate<A>) => <R, E>(self: Stream<R, E, A>) => Stream<R, E, A>;
```

### tap

Adds an effect to consumption of every element of the stream.

```ts
export declare const tap: <A, R2, E2, Z>(f: (a: A) => Effect<R2, E2, Z>) => <R, E>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, A>;
```

### tapError

Returns a stream that effectfully "peeks" at the failure of the stream.

```ts
export declare const tapError: <E, R2, E2, Z>(f: (e: E) => Effect<R2, E2, Z>) => <R, A>(self: Stream<R, E, A>) => Stream<R2 | R, E | E2, A>;
```

### tapErrorCause

Returns a stream that effectfully "peeks" at the cause of failure of the
stream.

```ts
export declare const tapErrorCause: <E, R2, E2, A2>(f: (cause: Cause<E>) => Effect<R2, E2, A2>) => <R, A>(self: Stream<R, E, A>) => Stream<R2 | R, E | E2, A>;
```

### tapSink

Sends all elements emitted by this stream to the specified sink in addition
to emitting them.

```ts
export declare const tapSink: <R2, E2, A, X, Z>(sink: Sink<R2, E2, A, X, Z>) => <R, E>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, A>;
```

### throttleEnforce

Throttles the chunks of this stream according to the given bandwidth
parameters using the token bucket algorithm. Allows for burst in the
processing of elements by allowing the token bucket to accumulate tokens up
to a `units + burst` threshold. Chunks that do not meet the bandwidth
constraints are dropped. The weight of each chunk is determined by the
`costFn` function.

```ts
export declare const throttleEnforce: <A>(units: number, duration: Duration, costFn: (input: Chunk<A>) => number, burst?: number) => <R, E>(self: Stream<R, E, A>) => Stream<R, E, A>;
```

### throttleEnforceEffect

Throttles the chunks of this stream according to the given bandwidth
parameters using the token bucket algorithm. Allows for burst in the
processing of elements by allowing the token bucket to accumulate tokens up
to a `units + burst` threshold. Chunks that do not meet the bandwidth
constraints are dropped. The weight of each chunk is determined by the
`costFn` effectful function.

```ts
export declare const throttleEnforceEffect: <A, R2, E2>(units: number, duration: Duration, costFn: (input: Chunk<A>) => Effect<R2, E2, number>, burst?: number) => <R, E>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, A>;
```

### throttleShape

Delays the chunks of this stream according to the given bandwidth
parameters using the token bucket algorithm. Allows for burst in the
processing of elements by allowing the token bucket to accumulate tokens up
to a `units + burst` threshold. The weight of each chunk is determined by
the `costFn` function.

```ts
export declare const throttleShape: <A>(units: number, duration: Duration, costFn: (input: Chunk<A>) => number, burst?: number) => <R, E>(self: Stream<R, E, A>) => Stream<R, E, A>;
```

### throttleShapeEffect

Delays the chunks of this stream according to the given bandwidth
parameters using the token bucket algorithm. Allows for burst in the
processing of elements by allowing the token bucket to accumulate tokens up
to a `units + burst` threshold. The weight of each chunk is determined by
the `costFn` effectful function.

```ts
export declare const throttleShapeEffect: <A, R2, E2>(units: number, duration: Duration, costFn: (input: Chunk<A>) => Effect<R2, E2, number>, burst?: number) => <R, E>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, A>;
```

### tick

Returns a stream that emits `undefined` values spaced by the specified
duration.

```ts
export declare const tick: (interval: Duration) => Stream<never, never, void>;
```

### timeout

Ends the stream if it does not produce a value after the specified duration.

```ts
export declare const timeout: (duration: Duration) => <R, E, A>(self: Stream<R, E, A>) => Stream<R, E, A>;
```

### timeoutFail

Fails the stream with given cause if it does not produce a value after the
specified duration.

```ts
export declare const timeoutFail: <E2>(e: LazyArg<E2>, duration: Duration) => <R, E, A>(self: Stream<R, E, A>) => Stream<R, E2 | E, A>;
```

### timeoutFailCause

Fails the stream with given cause if it does not produce a value after the
specified duration.

```ts
export declare const timeoutFailCause: <E2>(cause: LazyArg<Cause<E2>>, duration: Duration) => <R, E, A>(self: Stream<R, E, A>) => Stream<R, E2 | E, A>;
```

### timeoutTo

Switches the stream if it does not produce a value after the spcified
duration.

```ts
export declare const timeoutTo: <R2, E2, A2>(duration: Duration, that: Stream<R2, E2, A2>) => <R, E, A>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, A2 | A>;
```

### toHub

Converts the stream to a scoped hub of chunks. After the scope is closed,
the hub will never again produce values and should be discarded.

```ts
export declare const toHub: (capacity: number) => <R, E, A>(self: Stream<R, E, A>) => Effect<Scope | R, never, Hub<Take<E, A>>>;
```

### toPull

```ts
export declare const toPull: <R, E, A>(self: Stream<R, E, A>) => Effect<Scope | R, never, Effect<R, Maybe<E>, Chunk<A>>>;
```

### toQueue

Converts the stream to a scoped queue of chunks. After the scope is closed,
the queue will never again produce values and should be discarded.

```ts
export declare const toQueue: (capacity?: number) => <R, E, A>(self: Stream<R, E, A>) => Effect<Scope | R, never, Dequeue<Take<E, A>>>;
```

### toQueueDropping

Converts the stream to a sliding scoped queue of chunks. After the scope is
closed, the queue will never again produce values and should be discarded.

```ts
export declare const toQueueDropping: (capacity?: number) => <R, E, A>(self: Stream<R, E, A>) => Effect<Scope | R, never, Dequeue<Take<E, A>>>;
```

### toQueueOfElements

Converts the stream to a scoped queue of elements. After the scope is
closed, the queue will never again produce values and should be discarded.

```ts
export declare const toQueueOfElements: (capacity?: number) => <R, E, A>(self: Stream<R, E, A>) => Effect<Scope | R, never, Dequeue<Exit<Maybe<E>, A>>>;
```

### toQueueSliding

Converts the stream to a sliding scoped queue of chunks. After the scope is
closed, the queue will never again produce values and should be discarded.

```ts
export declare const toQueueSliding: (capacity?: number) => <R, E, A>(self: Stream<R, E, A>) => Effect<Scope | R, never, Dequeue<Take<E, A>>>;
```

### toQueueUnbounded

Converts the stream into an unbounded scoped queue. After the scope is
closed, the queue will never again produce values and should be discarded.

```ts
export declare const toQueueUnbounded: <R, E, A>(self: Stream<R, E, A>) => Effect<Scope | R, never, Dequeue<Take<E, A>>>;
```

### transduce

Applies the transducer to the stream and emits its outputs.

```ts
export declare const transduce: <R2, E2, A, Z>(sink: Sink<R2, E2, A, A, Z>) => <R, E>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, Z>;
```

### transducePush

Transduce a stream using a chunk processing function.

```ts
export declare const transducePush: <R2, R3, E2, In, Out>(push: Effect<Scope | R2, never, (input: Maybe<Chunk<In>>) => Effect<R3, E2, Chunk<Out>>>) => <R, E>(stream: Stream<R, E, In>) => Stream<R2 | R3 | R, E2 | E, Out>;
```

### tuple

```ts
export declare const tuple: <SN extends readonly Stream<any, any, any>[]>(...[s1, s2, ...streams]: SN & { readonly 0: Stream<any, any, any>; readonly 1: Stream<any, any, any>; }) => Stream<[SN[number]] extends [{ [_R]: () => infer R; }] ? R : never, [SN[number]] extends [{ [_E]: () => infer E; }] ? E : never, { [K in keyof SN]: [SN[number]] extends [{ [_A]: () => infer A; }] ? A : never; }>;
```

### unchunks

Takes a stream that emits chunks of values and submerges the chunks into the
structure of the stream, effectively "flattening" the chunks into the stream.

```ts
export declare const unchunks: <R, E, A>(self: Stream<R, E, Chunk<A>>) => Stream<R, E, A>;
```

### unfold

Creates a stream by peeling off the "layers" of a value of type `S`.

```ts
export declare const unfold: <S, A>(s: S, f: (s: S) => Maybe<readonly [A, S]>) => Stream<never, never, A>;
```

### unfoldChunk

Creates a stream by peeling off the "layers" of a value of type `S`.

```ts
export declare const unfoldChunk: <S, A>(s: S, f: (s: S) => Maybe<readonly [Chunk<A>, S]>) => Stream<never, never, A>;
```

### unfoldChunkEffect

Creates a stream by effectfully peeling off the "layers" of a value of type
`S`.

```ts
export declare const unfoldChunkEffect: <S, R, E, A>(s: S, f: (s: S) => Effect<R, E, Maybe<readonly [Chunk<A>, S]>>) => Stream<R, E, A>;
```

### unfoldEffect

Creates a stream by effectfully peeling off the "layers" of a value of type
`S`.

```ts
export declare const unfoldEffect: <S, R, E, A>(s: S, f: (s: S) => Effect<R, E, Maybe<readonly [A, S]>>) => Stream<R, E, A>;
```

### unit

Returns a stream that contains a single `undefined` value.

```ts
export declare const unit: Stream<never, never, void>;
```

### unwrap

Creates a stream produced from an `Effect`.

```ts
export declare const unwrap: <R, E, R1, E1, A>(effect: Effect<R, E, Stream<R1, E1, A>>) => Stream<R | R1, E | E1, A>;
```

### unwrapScoped

Creates a stream produced from a scoped effect.

```ts
export declare const unwrapScoped: <R, E, R1, E1, A>(effect: Effect<R, E, Stream<R1, E1, A>>) => Stream<R1 | Exclude<R, Scope>, E | E1, A>;
```

### updateService

Updates a service in the environment of this stream.

```ts
export declare const updateService: <T, T1 extends T>(tag: Tag<T>, f: (service: T) => T1) => <R, E, A>(self: Stream<R, E, A>) => Stream<T | R, E, A>;
```

### utf8Decode

```ts
export declare const utf8Decode: <R, E>(self: Stream<R, E, number>) => Stream<R, E, string>;
```

### utf8Encode

```ts
export declare const utf8Encode: <R, E>(self: Stream<R, E, string>) => Stream<R, E, number>;
```

### utf8WithBomEncode

```ts
export declare const utf8WithBomEncode: <R, E>(self: Stream<R, E, string>) => Stream<R, E, number>;
```

### utfDecode

Determines the right encoder to use based on the Byte Order Mark (BOM). If it
doesn't detect one, it defaults to utf8Decode.

```ts
export declare const utfDecode: <R, E>(self: Stream<R, E, number>) => Stream<R, E, string>;
```

### via

Threads the stream through the transformation function `f`.

```ts
export declare const via: <R, E, A, R1, E1, A1>(f: (a: Stream<R, E, A>) => Stream<R1, E1, A1>) => (self: Stream<R, E, A>) => Stream<R1, E1, A1>;
```

### when

Returns the specified stream if the given condition is satisfied, otherwise
returns an empty stream.

```ts
export declare const when: <R, E, A>(b: LazyArg<boolean>, stream: Stream<R, E, A>) => Stream<R, E, A>;
```

### whenCase

Returns the resulting stream when the given partial function is defined
for the given value, otherwise returns an empty stream.

```ts
export declare const whenCase: <R, E, A, A1>(a: LazyArg<A>, pf: (a: A) => Maybe<Stream<R, E, A1>>) => Stream<R, E, A1>;
```

### whenCaseEffect

Returns the resulting stream when the given partial function is defined
for the given effectful value, otherwise returns an empty stream.

```ts
export declare const whenCaseEffect: <R, E, A, R1, E1, A1>(a: Effect<R, E, A>, pf: (a: A) => Maybe<Stream<R1, E1, A1>>) => Stream<R | R1, E | E1, A1>;
```

### whenEffect

Returns the specified stream if the specified effectful condition is
satisfied, otherwise returns an empty stream.

```ts
export declare const whenEffect: <R, E, R1, E1, A>(b: Effect<R, E, boolean>, stream: Stream<R1, E1, A>) => Stream<R | R1, E | E1, A>;
```

### zip

Zips this stream with another point-wise and emits tuples of elements from
both streams.

The new stream will end when one of the sides ends.

```ts
export declare const zip: <R2, E2, A2>(that: Stream<R2, E2, A2>) => <R, E, A>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, readonly [A, A2]>;
```

### zipAll

Zips this stream with another point-wise, creating a new stream of pairs of
elements from both sides.

The defaults `defaultLeft` and `defaultRight` will be used if the streams
have different lengths and one of the streams has ended before the other.

```ts
export declare const zipAll: <R2, E2, A2, A>(that: Stream<R2, E2, A2>, defaultLeft: A, defaultRight: A2) => <R, E>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, readonly [A, A2]>;
```

### zipAllFlatten

Zips this stream with another point-wise, creating a new stream of pairs of
elements from both sides.

The defaults `defaultLeft` and `defaultRight` will be used if the streams
have different lengths and one of the streams has ended before the other.

```ts
export declare const zipAllFlatten: <R2, E2, A2, A extends readonly any[]>(that: Stream<R2, E2, A2>, defaultLeft: A, defaultRight: A2) => <R, E>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, readonly [...A, A2]>;
```

### zipAllLeft

Zips this stream with another point-wise, and keeps only elements from this
stream.

The provided default value will be used if the other stream ends before
this one.

```ts
export declare const zipAllLeft: <A, R2, E2, A2>(that: Stream<R2, E2, A2>, def: A) => <R, E>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, A>;
```

### zipAllRight

Zips this stream with another point-wise, and keeps only elements from the
other stream.

The provided default value will be used if this stream ends before the
other one.

```ts
export declare const zipAllRight: <R2, E2, A2>(that: Stream<R2, E2, A2>, def: A2) => <R, E, A>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, A2>;
```

### zipAllWith

Zips this stream with another point-wise. The provided functions will be
used to create elements for the composed stream.

The functions `left` and `right` will be used if the streams have different
lengths and one of the streams has ended before the other.

```ts
export declare const zipAllWith: <R2, E2, A2, A, A3>(that: Stream<R2, E2, A2>, left: (a: A) => A3, right: (a2: A2) => A3, both: (a: A, a2: A2) => A3) => <R, E>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, A3>;
```

### zipFlatten

Zips this stream with another point-wise and emits tuples of elements from
both streams.

The new stream will end when one of the sides ends.

```ts
export declare const zipFlatten: <R2, E2, A2>(that: Stream<R2, E2, A2>) => <R, E, A extends readonly any[]>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, readonly [...A, A2]>;
```

### zipLeft

Zips this stream with another point-wise, but keeps only the outputs of
this stream.

The new stream will end when one of the sides ends.

```ts
export declare const zipLeft: <R2, E2, A2>(that: Stream<R2, E2, A2>) => <R, E, A>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, A>;
```

### zipRight

Zips this stream with another point-wise, but keeps only the outputs of the
other stream.

The new stream will end when one of the sides ends.

```ts
export declare const zipRight: <R2, E2, A2>(that: Stream<R2, E2, A2>) => <R, E, A>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, A2>;
```

### zipWith

Zips this stream with another point-wise and applies the function to the
paired elements.

The new stream will end when one of the sides ends.

```ts
export declare const zipWith: <R2, E2, A2, A, A3>(that: Stream<R2, E2, A2>, f: (a: A, a2: A2) => A3) => <R, E>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, A3>;
```

### zipWithChunks

Zips this stream with another point-wise and applies the function to the
paired elements.

The new stream will end when one of the sides ends.

```ts
export declare const zipWithChunks: <R2, E2, A2, A, A3>(that: Stream<R2, E2, A2>, f: (leftChunk: Chunk<A>, rightChunk: Chunk<A2>) => readonly [Chunk<A3>, Either<Chunk<A>, Chunk<A2>>]) => <R, E>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, A3>;
```

### zipWithIndex

Zips this stream together with the index of elements.

```ts
export declare const zipWithIndex: <R, E, A>(self: Stream<R, E, A>) => Stream<R, E, readonly [A, number]>;
```

### zipWithLatest

Zips the two streams so that when a value is emitted by either of the two
streams, it is combined with the latest value from the other stream to
produce a result.

Note: tracking the latest value is done on a per-chunk basis. That means
that emitted elements that are not the last value in chunks will never be
used for zipping.

```ts
export declare const zipWithLatest: <R2, E2, A2, A, A3>(that: Stream<R2, E2, A2>, f: (a: A, a2: A2) => A3) => <R, E>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, A3>;
```

### zipWithNext

Zips each element with the next element if present.

```ts
export declare const zipWithNext: <R, E, A>(self: Stream<R, E, A>) => Stream<R, E, readonly [A, Maybe<A>]>;
```

### zipWithPrevious

Zips each element with the previous element. Initially accompanied by
`None`.

```ts
export declare const zipWithPrevious: <R, E, A>(self: Stream<R, E, A>) => Stream<R, E, readonly [Maybe<A>, A]>;
```

### zipWithPreviousAndNext

Zips each element with both the previous and next element.

```ts
export declare const zipWithPreviousAndNext: <R, E, A>(self: Stream<R, E, A>) => Stream<R, E, readonly [Maybe<A>, A, Maybe<A>]>;
```

