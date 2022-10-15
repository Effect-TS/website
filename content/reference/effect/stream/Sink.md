## Sink

Reference Documentation for the module '@effect/stream/Sink'

```ts
export interface Sink<R, E, In, L, Z> {
    readonly [SinkSym]: SinkSym;
    readonly [_R]: () => R;
    readonly [_E]: () => E;
    readonly [_In]: (_: In) => void;
    readonly [_L]: () => L;
    readonly [_Z]: () => Z;
}
```

## General API

### as

Replaces this sink's result with the provided value.

```ts
export declare const as: <Z2>(a: Z2) => <R, E, In, L, Z>(self: Sink<R, E, In, L, Z>) => Sink<R, E, In, L, Z2>;
```

### collectAll

```ts
export declare const collectAll: <In>() => Sink<never, never, In, never, Chunk<In>>;
```

### collectAllN

A sink that collects first `n` elements into a chunk.

```ts
export declare const collectAllN: <In>(n: number) => Sink<never, never, In, In, Chunk<In>>;
```

### collectAllToMap

A sink that collects all of its inputs into a map. The keys are extracted
from inputs using the keying function `key`; if multiple inputs use the
same key, they are merged using the `f` function.

```ts
export declare const collectAllToMap: <In, K>(key: (in_: In) => K, f: (in1: In, in2: In) => In) => Sink<never, never, In, never, HashMap<K, In>>;
```

### collectAllToMapN

A sink that collects first `n` keys into a map. The keys are calculated
from inputs using the keying function `key`; if multiple inputs use the the
same key, they are merged using the `f` function.

```ts
export declare const collectAllToMapN: <In, K>(n: number, key: (in_: In) => K, f: (in1: In, in2: In) => In) => Sink<never, never, In, In, HashMap<K, In>>;
```

### collectAllToSet

A sink that collects all of its inputs into a set.

```ts
export declare const collectAllToSet: <In>() => Sink<never, never, In, never, HashSet<In>>;
```

### collectAllToSetN

A sink that collects first `n` distinct inputs into a set.

```ts
export declare const collectAllToSetN: <In>(n: number) => Sink<never, never, In, In, HashSet<In>>;
```

### collectAllWhile

Accumulates incoming elements into a chunk as long as they verify predicate
`p`.

```ts
export declare const collectAllWhile: <In>(p: Predicate<In>) => Sink<never, never, In, In, Chunk<In>>;
```

### collectAllWhileEffect

Accumulates incoming elements into a chunk as long as they verify effectful
predicate `p`.

```ts
export declare const collectAllWhileEffect: <R, E, In>(p: (input: In) => Effect<R, E, boolean>) => Sink<R, E, In, In, Chunk<In>>;
```

### collectAllWhileWith

Repeatedly runs the sink for as long as its results satisfy the predicate
`p`. The sink's results will be accumulated using the stepping function
`f`.

```ts
export declare const collectAllWhileWith: <Z, S>(z: S, p: Predicate<Z>, f: (s: S, z: Z) => S) => <R, E, In, L extends In>(self: Sink<R, E, In, L, Z>) => Sink<R, E, In, L, S>;
```

### contramap

Transforms this sink's input elements.

```ts
export declare const contramap: <In, In1>(f: (input: In1) => In) => <R, E, L, Z>(self: Sink<R, E, In, L, Z>) => Sink<R, E, In1, L, Z>;
```

### contramapChunks

Transforms this sink's input chunks. `f` must preserve chunking-invariance.

```ts
export declare const contramapChunks: <In, In1>(f: (input: Chunk<In1>) => Chunk<In>) => <R, E, L, Z>(self: Sink<R, E, In, L, Z>) => Sink<R, E, In1, L, Z>;
```

### contramapChunksEffect

Effectfully transforms this sink's input chunks. `f` must preserve
chunking-invariance.

```ts
export declare const contramapChunksEffect: <In0, R2, E2, In2>(f: (input: Chunk<In0>) => Effect<R2, E2, Chunk<In2>>) => <R, E, L, Z>(self: Sink<R, E, In2, L, Z>) => Sink<R2 | R, E2 | E, In0, L, Z>;
```

### contramapEffect

Effectfully transforms this sink's input elements.

```ts
export declare const contramapEffect: <In0, R2, E2, In2>(f: (input: In0) => Effect<R2, E2, In2>) => <R, E, L, Z>(self: Sink<R, E, In2, L, Z>) => Sink<R2 | R, E2 | E, In0, L, Z>;
```

### count

A sink that counts the number of elements fed to it.

```ts
export declare const count: () => Sink<never, never, unknown, never, number>;
```

### die

Creates a sink halting with the specified defect.

```ts
export declare const die: (defect: unknown) => Sink<never, never, unknown, never, never>;
```

### dieMessage

Creates a sink halting with the specified message, wrapped in a
`RuntimeError`.

```ts
export declare const dieMessage: (message: string) => Sink<never, never, unknown, never, never>;
```

### dieSync

Creates a sink halting with the specified defect.

```ts
export declare const dieSync: (defect: LazyArg<unknown>) => Sink<never, never, unknown, never, never>;
```

### dimap

Transforms both inputs and result of this sink using the provided
functions.

```ts
export declare const dimap: <In, In1, Z, Z1>(f: (input: In1) => In, g: (z: Z) => Z1) => <R, E, L>(self: Sink<R, E, In, L, Z>) => Sink<R, E, In1, L, Z1>;
```

### dimapChunks

Transforms both input chunks and result of this sink using the provided
functions.

```ts
export declare const dimapChunks: <In, In1, Z, Z1>(f: (input: Chunk<In1>) => Chunk<In>, g: (z: Z) => Z1) => <R, E, L>(self: Sink<R, E, In, L, Z>) => Sink<R, E, In1, L, Z1>;
```

### dimapChunksEffect

Effectfully transforms both input chunks and result of this sink using the
provided functions. `f` and `g` must preserve chunking-invariance.

```ts
export declare const dimapChunksEffect: <R2, E2, In, In1, Z, Z1>(f: (input: Chunk<In1>) => Effect<R2, E2, Chunk<In>>, g: (z: Z) => Z1) => <R, E, L>(self: Sink<R, E, In, L, Z>) => Sink<R2 | R, E2 | E, In1, L, Z1>;
```

### dimapEffect

Effectfully transforms both inputs and result of this sink using the
provided functions.

```ts
export declare const dimapEffect: <R2, E2, In, In1, Z, Z1>(f: (input: In1) => Effect<R2, E2, In>, g: (z: Z) => Z1) => <R, E, L>(self: Sink<R, E, In, L, Z>) => Sink<R2 | R, E2 | E, In1, L, Z1>;
```

### drain

A sink that ignores its inputs.

```ts
export declare const drain: () => Sink<never, never, unknown, never, void>;
```

### dropLeftover

```ts
export declare const dropLeftover: <R, E, In, L, Z>(self: Sink<R, E, In, L, Z>) => Sink<R, E, In, never, Z>;
```

### dropWhile

```ts
export declare const dropWhile: <In>(p: Predicate<In>) => Sink<never, never, In, In, unknown>;
```

### dropWhileEffect

```ts
export declare const dropWhileEffect: <R, E, In>(p: (input: In) => Effect<R, E, boolean>) => Sink<R, E, In, In, unknown>;
```

### environmentWithSink

Accesses the environment of the sink in the context of a sink.

```ts
export declare const environmentWithSink: <R0, R, E, In, L, Z>(f: (env: Env<R0>) => Sink<R, E, In, L, Z>) => Sink<R0 | R, E, In, L, Z>;
```

### exposeLeftover

```ts
export declare const exposeLeftover: <R, E, In, L, Z>(self: Sink<R, E, In, L, Z>) => Sink<R, E, In, L, readonly [Z, Chunk<L>]>;
```

### fail

A sink that always fails with the specified error.

```ts
export declare const fail: <E>(e: E) => Sink<never, E, unknown, never, never>;
```

### failCause

Creates a sink halting with a specified cause.

```ts
export declare const failCause: <E>(cause: Cause<E>) => Sink<never, E, unknown, never, never>;
```

### failCauseSync

Creates a sink halting with a specified cause.

```ts
export declare const failCauseSync: <E>(cause: LazyArg<Cause<E>>) => Sink<never, E, unknown, never, never>;
```

### failSync

A sink that always fails with the specified error.

```ts
export declare const failSync: <E>(e: LazyArg<E>) => Sink<never, E, unknown, never, never>;
```

### filterInput

Filter the input of this sink using the specified predicate.

```ts
export declare const filterInput: { <In, In1 extends In, In2 extends In1>(f: Refinement<In1, In2>): <R, E, L, Z>(self: Sink<R, E, In, L, Z>) => Sink<R, E, In2, L, Z>; <In, In1 extends In>(f: Predicate<In1>): <R, E, L, Z>(self: Sink<R, E, In, L, Z>) => Sink<R, E, In1, L, Z>; };
```

### filterInputEffect

Effectfully filter the input of this sink using the specified predicate.

```ts
export declare const filterInputEffect: <R2, E2, In, In1 extends In>(p: (input: In1) => Effect<R2, E2, boolean>) => <R, E, L, Z>(self: Sink<R, E, In, L, Z>) => Sink<R2 | R, E2 | E, In1, L, Z>;
```

### flatMap

Runs this sink until it yields a result, then uses that result to create
another sink from the provided function which will continue to run until it
yields a result.

This function essentially runs sinks in sequence.

```ts
export declare const flatMap: <R1, E1, In, In1 extends In, L, L1 extends L, Z, Z1>(f: (z: Z) => Sink<R1, E1, In1, L1, Z1>) => <R, E>(self: Sink<R, E, In, L, Z>) => Sink<R1 | R, E1 | E, In & In1, L1, Z1>;
```

### fold

A sink that folds its inputs with the provided function, termination
predicate and initial state.

```ts
export declare const fold: <In, S>(z: S, cont: Predicate<S>, f: (s: S, input: In) => S) => Sink<never, never, In, In, S>;
```

### foldChunks

A sink that folds its input chunks with the provided function, termination
predicate and initial state. The `cont` condition is checked only for the
initial value and at the end of processing of each chunk. `f` and `cont`
must preserve chunking-invariance.

```ts
export declare const foldChunks: <In, S>(z: S, cont: Predicate<S>, f: (s: S, input: Chunk<In>) => S) => Sink<never, never, In, unknown, S>;
```

### foldChunksEffect

A sink that folds its input chunks with the provided function, termination
predicate and initial state. The `cont` condition is checked only for the
initial value and at the end of processing of each chunk. `f` and `cont`
must preserve chunking-invariance.

```ts
export declare const foldChunksEffect: <R, E, S, In>(z: S, cont: Predicate<S>, f: (s: S, input: Chunk<In>) => Effect<R, E, S>) => Sink<R, E, In, never, S>;
```

### foldEffect

A sink that effectfully folds its inputs with the provided function,
termination predicate and initial state.

```ts
export declare const foldEffect: <R, E, In, S>(z: S, cont: Predicate<S>, f: (s: S, input: In) => Effect<R, E, S>) => Sink<R, E, In, In, S>;
```

### foldLeft

A sink that folds its inputs with the provided function and initial state.

```ts
export declare const foldLeft: <In, S>(z: S, f: (s: S, input: In) => S) => Sink<never, never, In, never, S>;
```

### foldLeftChunks

A sink that folds its input chunks with the provided function and initial
state. `f` must preserve chunking-invariance.

```ts
export declare const foldLeftChunks: <In, S>(z: S, f: (s: S, input: Chunk<In>) => S) => Sink<never, never, In, never, S>;
```

### foldLeftChunksEffect

A sink that effectfully folds its input chunks with the provided function
and initial state. `f` must preserve chunking-invariance.

```ts
export declare const foldLeftChunksEffect: <R, E, In, S>(z: S, f: (s: S, input: Chunk<In>) => Effect<R, E, S>) => Sink<R, E, In, never, S>;
```

### foldLeftEffect

A sink that effectfully folds its inputs with the provided function and
initial state.

```ts
export declare const foldLeftEffect: <R, E, In, S>(z: S, f: (s: S, input: In) => Effect<R, E, S>) => Sink<R, E, In, In, S>;
```

### foldSink_

```ts
export declare const foldSink_: <R1, R2, E, E1, E2, In, In1 extends In, In2 extends In, L, L1 extends L, L2 extends L, Z, Z1, Z2>(failure: (err: E) => Sink<R1, E1, In1, L1, Z1>, success: (z: Z) => Sink<R2, E2, In2, L2, Z2>) => <R>(self: Sink<R, E, In, L, Z>) => Sink<R1 | R2 | R, E1 | E2, In1 & In2, L1 | L2, Z1 | Z2>;
```

### foldUntil

Creates a sink that folds elements of type `In` into a structure of type
`S` until `max` elements have been folded.

Like `foldWeighted`, but with a constant cost function of 1.

```ts
export declare const foldUntil: <In, S>(z: S, max: number, f: (s: S, input: In) => S) => Sink<never, never, In, In, S>;
```

### foldUntilEffect

Creates a sink that effectfully folds elements of type `In` into a
structure of type `S` until `max` elements have been folded.

Like `foldWeightedEffect`, but with a constant cost function of 1.

```ts
export declare const foldUntilEffect: <R, E, In, S>(z: S, max: number, f: (s: S, input: In) => Effect<R, E, S>) => Sink<R, E, In, In, S>;
```

### foldWeighted

Creates a sink that folds elements of type `In` into a structure of type
`S`, until `max` worth of elements (determined by the `costFn`) have been
folded.

```ts
export declare const foldWeighted: <In, S>(z: S, costFn: (s: S, input: In) => number, max: number, f: (s: S, input: In) => S) => Sink<never, never, In, In, S>;
```

### foldWeightedDecompose

Creates a sink that folds elements of type `In` into a structure of type
`S`, until `max` worth of elements (determined by the `costFn`) have been
folded.

The `decompose` function will be used for decomposing elements that cause
an `S` aggregate to cross `max` into smaller elements.

Be vigilant with this function, it has to generate "simpler" values or the
fold may never end. A value is considered indivisible if `decompose` yields
the empty chunk or a single-valued chunk. In these cases, there is no other
choice than to yield a value that will cross the threshold.

The `foldWeightedDecomposeEffect` allows the decompose function to return a
`Effect` value, and consequently it allows the sink to fail.

```ts
export declare const foldWeightedDecompose: <S, In>(z: S, costFn: (s: S, input: In) => number, max: number, decompose: (input: In) => Chunk<In>, f: (s: S, input: In) => S) => Sink<never, never, In, In, S>;
```

### foldWeightedDecomposeEffect

Creates a sink that effectfully folds elements of type `In` into a
structure of type `S`, until `max` worth of elements (determined by the
`costFn`) have been folded.

The `decompose` function will be used for decomposing elements that cause
an `S` aggregate to cross `max` into smaller elements. Be vigilant with
this function, it has to generate "simpler" values or the fold may never
end. A value is considered indivisible if `decompose` yields the empty
chunk or a single-valued chunk. In these cases, there is no other choice
than to yield a value that will cross the threshold.

```ts
export declare const foldWeightedDecomposeEffect: <R, E, R2, E2, R3, E3, In, S>(z: S, costFn: (s: S, input: In) => Effect<R, E, number>, max: number, decompose: (input: In) => Effect<R2, E2, Chunk<In>>, f: (s: S, input: In) => Effect<R3, E3, S>) => Sink<R | R2 | R3, E | E2 | E3, In, In, S>;
```

### foldWeightedEffect

Creates a sink that effectfully folds elements of type `In` into a
structure of type `S`, until `max` worth of elements (determined by the
`costFn`) have been folded.

```ts
export declare const foldWeightedEffect: <R, E, R2, E2, In, S>(z: S, costFn: (s: S, input: In) => Effect<R, E, number>, max: number, f: (s: S, input: In) => Effect<R2, E2, S>) => Sink<R | R2, E | E2, In, In, S>;
```

### forEach

A sink that executes the provided effectful function for every element fed
to it.

```ts
export declare const forEach: <R, E, In, Z>(f: (input: In) => Effect<R, E, Z>) => Sink<R, E, In, never, void>;
```

### forEachChunk

A sink that executes the provided effectful function for every chunk fed to
it.

```ts
export declare const forEachChunk: <R, E, In, Z>(f: (input: Chunk<In>) => Effect<R, E, Z>) => Sink<R, E, In, never, void>;
```

### forEachChunkWhile

A sink that executes the provided effectful function for every chunk fed to
it until `f` evaluates to `false`.

```ts
export declare const forEachChunkWhile: <R, E, In>(f: (input: Chunk<In>) => Effect<R, E, boolean>) => Sink<R, E, In, In, void>;
```

### forEachWhile

A sink that executes the provided effectful function for every element fed
to it until `f` evaluates to `false`.

```ts
export declare const forEachWhile: <R, E, In>(f: (input: In) => Effect<R, E, boolean>) => Sink<R, E, In, In, void>;
```

### fromEffect

Creates a single-value sink produced from an effect.

```ts
export declare const fromEffect: <R, E, Z>(effect: Effect<R, E, Z>) => Sink<R, E, unknown, unknown, Z>;
```

### fromHub

Create a sink which publishes each element to the specified hub.

```ts
export declare const fromHub: <In>(hub: Hub<In>) => Sink<never, never, In, never, void>;
```

### fromHubWithShutdown

Create a sink which publishes each element to the specified hub. The hub
will be shutdown once the stream is closed.

```ts
export declare const fromHubWithShutdown: <In>(hub: Hub<In>) => Sink<never, never, In, never, void>;
```

### fromPush

Creates a sink from a chunk processing function.

```ts
export declare const fromPush: <R, E, In, L, Z>(push: Effect<Scope | R, never, (input: Maybe<Chunk<In>>) => Effect<R, readonly [Either<E, Z>, Chunk<L>], void>>) => Sink<R, E, In, L, Z>;
```

### fromQueue

Create a sink which enqueues each element into the specified queue.

```ts
export declare const fromQueue: <In>(queue: Enqueue<In>) => Sink<never, never, In, never, void>;
```

### fromQueueWithShutdown

Create a sink which enqueues each element into the specified queue. The
queue will be shutdown once the stream is closed.

```ts
export declare const fromQueueWithShutdown: <In>(queue: Enqueue<In>) => Sink<never, never, In, never, void>;
```

### head

Creates a sink containing the first value.

```ts
export declare const head: <In>() => Sink<never, never, In, In, Maybe<In>>;
```

### last

Creates a sink containing the last value.

```ts
export declare const last: <In>() => Sink<never, never, In, In, Maybe<In>>;
```

### leftover

```ts
export declare const leftover: <L>(chunk: Chunk<L>) => Sink<never, never, unknown, L, void>;
```

### log

Logs the specified message at the current log level.

```ts
export declare const log: (message: string) => Sink<never, never, unknown, unknown, void>;
```

### logAnnotate

Annotates each log in streams composed after this with the specified log
annotation.

```ts
export declare const logAnnotate: (key: string, value: string) => <R, E, In, L, Z>(sink: Sink<R, E, In, L, Z>) => Sink<R, E, In, L, Z>;
```

### logAnnotations

Retrieves the log annotations associated with the current scope.

```ts
export declare const logAnnotations: () => Sink<never, never, unknown, unknown, ImmutableMap<string, string>>;
```

### logDebug

Logs the specified message at the debug log level.

```ts
export declare const logDebug: (message: string) => Sink<never, never, unknown, unknown, void>;
```

### logError

Logs the specified message at the error log level.

```ts
export declare const logError: (message: string) => Sink<never, never, unknown, unknown, void>;
```

### logErrorCause

Logs the specified message at the error log level.

```ts
export declare const logErrorCause: (cause: Cause<unknown>) => Sink<never, never, unknown, unknown, void>;
```

### logFatal

Logs the specified message at the fatal log level.

```ts
export declare const logFatal: (message: string) => Sink<never, never, unknown, unknown, void>;
```

### logInfo

Logs the specified message at the info log level.

```ts
export declare const logInfo: (message: string) => Sink<never, never, unknown, unknown, void>;
```

### logLevel

Sets the log level for streams composed after this.

```ts
export declare const logLevel: (level: LogLevel) => <R, E, In, L, Z>(sink: Sink<R, E, In, L, Z>) => Sink<R, E, In, L, Z>;
```

### logSpan

Adjusts the label for the logging span for streams composed after this.

```ts
export declare const logSpan: (label: string) => <R, E, In, L, Z>(sink: Sink<R, E, In, L, Z>) => Sink<R, E, In, L, Z>;
```

### logTrace

Logs the specified message at the trace log level.

```ts
export declare const logTrace: (message: string) => Sink<never, never, unknown, unknown, void>;
```

### logWarning

Logs the specified message at the warning log level.

```ts
export declare const logWarning: (message: string) => Sink<never, never, unknown, unknown, void>;
```

### map

Transforms this sink's result.

```ts
export declare const map: <Z, Z2>(f: (z: Z) => Z2) => <R, E, In, L>(self: Sink<R, E, In, L, Z>) => Sink<R, E, In, L, Z2>;
```

### mapEffect

Effectfully transforms this sink's result.

```ts
export declare const mapEffect: <R2, E2, Z, Z2>(f: (z: Z) => Effect<R2, E2, Z2>) => <R, E, In, L>(self: Sink<R, E, In, L, Z>) => Sink<R2 | R, E2 | E, In, L, Z2>;
```

### mapError

Transforms the errors emitted by this sink using `f`.

```ts
export declare const mapError: <E, E2>(f: (z: E) => E2) => <R, In, L, Z>(self: Sink<R, E, In, L, Z>) => Sink<R, E2, In, L, Z>;
```

### mkString

```ts
export declare const mkString: () => Sink<never, never, unknown, never, string>;
```

### never

```ts
export declare const never: Sink<never, never, unknown, unknown, never>;
```

### orElse

Returns a new sink that will perform the operations of this one, until
failure, and then it will switch over to the operations of the specified
fallback sink.

```ts
export declare const orElse: <R1, E1, In, In1 extends In, L, L1 extends L, Z1>(that: LazyArg<Sink<R1, E1, In1, L1, Z1>>) => <R, E, Z>(self: Sink<R, E, In, L, Z>) => Sink<R1 | R, E1, In & In1, L, Z1 | Z>;
```

### provideEnvironment

Provides the sink with its required environment, which eliminates its
dependency on `R`.

```ts
export declare const provideEnvironment: <R>(env: Env<R>) => <E, In, L, Z>(self: Sink<R, E, In, L, Z>) => Sink<never, E, In, L, Z>;
```

### race

Runs both sinks in parallel on the input, , returning the result or the
error from the one that finishes first.

```ts
export declare const race: <R1, E1, In1, L1, Z1>(that: Sink<R1, E1, In1, L1, Z1>) => <R, E, In, L, Z>(self: Sink<R, E, In, L, Z>) => Sink<R1 | R, E1 | E, In & In1, L1 | L, Z1 | Z>;
```

### raceBoth

Runs both sinks in parallel on the input, returning the result or the error
from the one that finishes first.

```ts
export declare const raceBoth: <R1, E1, In1, L1, Z1>(that: Sink<R1, E1, In1, L1, Z1>, capacity?: number) => <R, E, In, L, Z>(self: Sink<R, E, In, L, Z>) => Sink<R1 | R, E1 | E, In & In1, L1 | L, Either<Z, Z1>>;
```

### raceWith

Runs both sinks in parallel on the input, using the specified merge
function as soon as one result or the other has been computed.

```ts
export declare const raceWith: <R1, E1, In1, L1, Z1, E, Z, Z2>(that: Sink<R1, E1, In1, L1, Z1>, leftDone: (exit: Exit<E, Z>) => MergeDecision<R1, E1, Z1, E1 | E, Z2>, rightDone: (exit: Exit<E1, Z1>) => MergeDecision<R1, E, Z, E1 | E, Z2>, capacity?: number) => <R, In, L>(self: Sink<R, E, In, L, Z>) => Sink<R1 | R, E1 | E, In & In1, L1 | L, Z2>;
```

### repeat

Repeatedly runs the provided sink.

```ts
export declare const repeat: <R, E, In, L extends In, Z>(self: Sink<R, E, In, L, Z>) => Sink<R, E, In, L, Chunk<Z>>;
```

### splitWhere

Splits the sink on the specified predicate, returning a new sink that
consumes elements until an element after the first satisfies the specified
predicate.

```ts
export declare const splitWhere: <In1>(f: Predicate<In1>) => <R, E, In, L extends In1, Z>(self: Sink<R, E, In, L, Z>) => Sink<R, E, In & In1, In1, Z>;
```

### succeed

A sink that immediately ends with the specified value.

```ts
export declare const succeed: <Z>(z: Z) => Sink<never, never, unknown, never, Z>;
```

### sum

A sink that sums incoming numeric values.

```ts
export declare const sum: () => Sink<never, never, number, never, number>;
```

### summarized

Summarize a sink by running an effect when the sink starts and again when
it completes

```ts
export declare const summarized: <R1, E1, B, C>(summary: Effect<R1, E1, B>, f: (x: B, y: B) => C) => <R, E, In, L, Z>(self: Sink<R, E, In, L, Z>) => Sink<R1 | R, E1 | E, In, L, readonly [Z, C]>;
```

### suspend

Returns a lazily constructed sink that may require effects for its
creation.

```ts
export declare const suspend: <R, E, In, L, Z>(sink: LazyArg<Sink<R, E, In, L, Z>>) => Sink<R, E, In, L, Z>;
```

### sync

A sink that immediately ends with the specified value.

```ts
export declare const sync: <Z>(z: LazyArg<Z>) => Sink<never, never, unknown, never, Z>;
```

### take

A sink that takes the specified number of values.

```ts
export declare const take: <In>(n: number) => Sink<never, never, In, In, Chunk<In>>;
```

### timed

Times the execution of a sink in milliseconds.

```ts
export declare const timed: () => Sink<never, never, unknown, never, Duration>;
```

### tuple

```ts
export declare const tuple: <SN extends readonly Sink<any, any, any, any, any>[]>(...[s1, s2, ...sinks]: SN & { readonly 0: Sink<any, any, any, any, any>; readonly 1: Sink<any, any, any, any, any>; }) => Sink<[SN[number]] extends [{ [_R]: () => infer R; }] ? R : never, [SN[number]] extends [{ [_E]: () => infer E; }] ? E : never, [SN[number]] extends [{ [_In]: (_: infer In) => void; }] ? In : never, [SN[number]] extends [{ [_L]: () => infer L; }] ? L : never, { [K in keyof SN]: [SN[K]] extends [{ [_Z]: () => infer Z; }] ? Z : never; }>;
```

### untilOutputEffect

Creates a sink that produces values until one verifies the predicate `f`.

```ts
export declare const untilOutputEffect: <R2, E2, Z>(f: (z: Z) => Effect<R2, E2, boolean>) => <R, E, In, L extends In>(self: Sink<R, E, In, L, Z>) => Sink<R2 | R, E2 | E, In, L, Maybe<Z>>;
```

### unwrap

Creates a sink produced from an effect.

```ts
export declare const unwrap: <R, E, In, L, Z>(effect: Effect<R, E, Sink<R, E, In, L, Z>>) => Sink<R, E, In, L, Z>;
```

### unwrapScoped

Creates a sink produced from a scoped effect.

```ts
export declare const unwrapScoped: <R, E, In, L, Z>(effect: Effect<Scope | R, E, Sink<R, E, In, L, Z>>) => Sink<R, E, In, L, Z>;
```

### withDuration

Returns the sink that executes this one and times its execution in
milliseconds.

```ts
export declare const withDuration: <R, E, In, L, Z>(self: Sink<R, E, In, L, Z>) => Sink<R, E, In, L, readonly [Z, Duration]>;
```

### zip

```ts
export declare const zip: <R1, E1, In, In1 extends In, L, L1 extends L, Z1>(that: Sink<R1, E1, In1, L1, Z1>) => <R, E, Z>(self: Sink<R, E, In, L, Z>) => Sink<R1 | R, E1 | E, In & In1, L1, readonly [Z, Z1]>;
```

### zipFlatten

```ts
export declare const zipFlatten: <R1, E1, In, In1 extends In, L, L1 extends L, Z1>(that: Sink<R1, E1, In1, L1, Z1>) => <R, E, Z extends readonly any[]>(self: Sink<R, E, In, L, Z>) => Sink<R1 | R, E1 | E, In & In1, L1, readonly [...Z, Z1]>;
```

### zipLeft

Like `zip`, but keeps only the result from the this sink.

```ts
export declare const zipLeft: <R1, E1, In, In1 extends In, L, L1 extends L, Z1>(that: Sink<R1, E1, In1, L1, Z1>) => <R, E, Z>(self: Sink<R, E, In, L, Z>) => Sink<R1 | R, E1 | E, In & In1, L1, Z>;
```

### zipPar

Runs both sinks in parallel on the input and combines the results in a
tuple.

```ts
export declare const zipPar: <R1, E1, In1, L1, Z1>(that: Sink<R1, E1, In1, L1, Z1>) => <R, E, In, L, Z>(self: Sink<R, E, In, L, Z>) => Sink<R1 | R, E1 | E, In & In1, L1 | L, readonly [Z, Z1]>;
```

### zipParLeft

Like `zipPar`, but keeps only the result from this sink.

```ts
export declare const zipParLeft: <R1, E1, In1, L1, Z1>(that: Sink<R1, E1, In1, L1, Z1>) => <R, E, In, L, Z>(self: Sink<R, E, In, L, Z>) => Sink<R1 | R, E1 | E, In & In1, L1 | L, Z>;
```

### zipParRight

Like `zipPar`, but keeps only the result from that sink.

```ts
export declare const zipParRight: <R1, E1, In1, L1, Z1>(that: Sink<R1, E1, In1, L1, Z1>) => <R, E, In, L, Z>(self: Sink<R, E, In, L, Z>) => Sink<R1 | R, E1 | E, In & In1, L1 | L, Z1>;
```

### zipRight

Like `zip`, but keeps only the result from the that sink.

```ts
export declare const zipRight: <R1, E1, In, In1 extends In, L, L1 extends L, Z1>(that: Sink<R1, E1, In1, L1, Z1>) => <R, E, Z>(self: Sink<R, E, In, L, Z>) => Sink<R1 | R, E1 | E, In & In1, L1, Z1>;
```

### zipWith

Feeds inputs to this sink until it yields a result, then switches over to
the provided sink until it yields a result, finally combining the two
results with `f`.

```ts
export declare const zipWith: <R1, E1, In, In1 extends In, L, L1 extends L, Z, Z1, Z2>(that: Sink<R1, E1, In1, L1, Z1>, f: (z: Z, z1: Z1) => Z2) => <R, E>(self: Sink<R, E, In, L, Z>) => Sink<R1 | R, E1 | E, In & In1, L1, Z2>;
```

### zipWithPar

Feeds inputs to this sink until it yields a result, then switches over to
the provided sink until it yields a result, finally combining the two
results with `f`.

```ts
export declare const zipWithPar: <R1, E1, In1, L1, Z, Z1, Z2>(that: Sink<R1, E1, In1, L1, Z1>, f: (z: Z, z1: Z1) => Z2) => <R, E, In, L>(self: Sink<R, E, In, L, Z>) => Sink<R1 | R, E1 | E, In & In1, L1 | L, Z2>;
```

