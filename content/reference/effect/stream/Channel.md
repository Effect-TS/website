## Channel

Reference Documentation for the module '@effect/stream/Channel'

A `Channel` is a nexus of I/O operations, which supports both reading and
writing. A channel may read values of type `InElem` and write values of type
`OutElem`. When the channel finishes, it yields a value of type `OutDone`. A
channel may fail with a value of type `OutErr`.

Channels are the foundation of Streams: both streams and sinks are built on
channels. Most users shouldn't have to use channels directly, as streams and
sinks are much more convenient and cover all common use cases. However, when
adding new stream and sink operators, or doing something highly specialized,
it may be useful to use channels directly.

Channels compose in a variety of ways:

 - **Piping**: One channel can be piped to another channel, assuming the
   input type of the second is the same as the output type of the first.
 - **Sequencing**: The terminal value of one channel can be used to create
   another channel, and both the first channel and the function that makes
   the second channel can be composed into a channel.
 - **Concatenating**: The output of one channel can be used to create other
   channels, which are all concatenated together. The first channel and the
   function that makes the other channels can be composed into a channel.

```ts
export interface Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone> {
    readonly [ChannelSym]: ChannelSym;
    readonly [_Env]: () => Env;
    readonly [_InErr]: (_: InErr) => void;
    readonly [_InElem]: (_: InElem) => void;
    readonly [_InDone]: (_: InDone) => void;
    readonly [_OutErr]: () => OutErr;
    readonly [_OutElem]: () => OutElem;
    readonly [_OutDone]: () => OutDone;
}
```

## Method

### acquireUseRelease

```ts
export declare const acquireUseRelease: <Env, InErr, InElem, InDone, OutErr, OutElem1, OutDone, Acquired>(acquire: Effect<Env, OutErr, Acquired>, use: (a: Acquired) => Channel<Env, InErr, InElem, InDone, OutErr, OutElem1, OutDone>, release: (a: Acquired) => Effect<Env, never, any>) => Channel<Env, InErr, InElem, InDone, OutErr, OutElem1, OutDone>;
```

### acquireUseReleaseExit

```ts
export declare const acquireUseReleaseExit: <Env, InErr, InElem, InDone, OutErr, OutElem1, OutDone, Acquired>(acquire: Effect<Env, OutErr, Acquired>, use: (a: Acquired) => Channel<Env, InErr, InElem, InDone, OutErr, OutElem1, OutDone>, release: (a: Acquired, exit: Exit<OutErr, OutDone>) => Effect<Env, never, any>) => Channel<Env, InErr, InElem, InDone, OutErr, OutElem1, OutDone>;
```

### acquireUseReleaseOut

```ts
export declare const acquireUseReleaseOut: <Env, OutErr, Acquired, Z>(acquire: Effect<Env, OutErr, Acquired>, release: (a: Acquired) => Effect<Env, never, Z>) => Channel<Env, unknown, unknown, unknown, OutErr, Acquired, void>;
```

### acquireUseReleaseOutExit_

```ts
export declare const acquireUseReleaseOutExit_: <R, R2, E, Z>(self: Effect<R, E, Z>, release: (z: Z, e: Exit<unknown, unknown>) => Effect<R2, never, unknown>) => Channel<R | R2, unknown, unknown, unknown, E, Z, void>;
```

### as

Returns a new channel that is the same as this one, except the terminal
value of the channel is the specified constant value.

This method produces the same result as mapping this channel to the
specified constant value.

```ts
export declare const as: <OutDone2>(z2: OutDone2) => <Env_1, InErr, InElem, InDone, OutErr, OutElem, OutDone>(self: Channel<Env_1, InErr, InElem, InDone, OutErr, OutElem, OutDone>) => Channel<Env_1, InErr, InElem, InDone, OutErr, OutElem, OutDone2>;
```

### bind

```ts
export declare const bind: <N extends string, K, Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone>(tag: Exclude<N, keyof K>, f: (_: K) => Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone>) => <Env_1, InErr, InElem, InDone, OutErr, OutElem>(self: Channel<Env_1, InErr, InElem, InDone, OutErr, OutElem, K>) => Channel<Env1 | Env_1, InErr & InErr1, InElem & InElem1, InDone & InDone1, OutErr1 | OutErr, OutElem1 | OutElem, K & { [k in N]: OutDone; }>;
```

### bindValue

```ts
export declare const bindValue: <N extends string, K, OutDone>(tag: Exclude<N, keyof K>, f: (_: K) => OutDone) => <Env_1, InErr, InElem, InDone, OutErr, OutElem>(self: Channel<Env_1, InErr, InElem, InDone, OutErr, OutElem, K>) => Channel<Env_1, InErr, InElem, InDone, OutErr, OutElem, K & { [k in N]: OutDone; }>;
```

### buffer

Creates a channel backed by a buffer. When the buffer is empty, the channel
will simply passthrough its input as output. However, when the buffer is
non-empty, the value inside the buffer will be passed along as output.

```ts
export declare const buffer: <InElem, InErr, InDone>(empty: InElem, isEmpty: Predicate<InElem>, ref: Ref<InElem>) => Channel<never, InErr, InElem, InDone, InErr, InElem, InDone>;
```

### bufferChunk

```ts
export declare const bufferChunk: <InElem, InErr, InDone>(ref: Ref<Chunk<InElem>>) => Channel<never, InErr, Chunk<InElem>, InDone, InErr, Chunk<InElem>, InDone>;
```

### catchAll

Returns a new channel that is the same as this one, except if this channel
errors for any typed error, then the returned channel will switch over to
using the fallback channel returned by the specified error handler.

```ts
export declare const catchAll: <Env1, InErr1, InElem1, InDone1, OutErr, OutErr1, OutElem1, OutDone1>(f: (error: OutErr) => Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>) => <Env_1, InErr, InElem, InDone, OutElem, OutDone>(self: Channel<Env_1, InErr, InElem, InDone, OutErr, OutElem, OutDone>) => Channel<Env1 | Env_1, InErr & InErr1, InElem & InElem1, InDone & InDone1, OutErr1, OutElem1 | OutElem, OutDone1 | OutDone>;
```

### catchAllCause

Returns a new channel that is the same as this one, except if this channel
errors for any cause at all, then the returned channel will switch over to
using the fallback channel returned by the specified error handler.

```ts
export declare const catchAllCause: <Env1, InErr1, InElem1, InDone1, OutErr, OutErr1, OutElem1, OutDone1>(f: (cause: Cause<OutErr>) => Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>) => <Env_1, InErr, InElem, InDone, OutElem, OutDone>(self: Channel<Env_1, InErr, InElem, InDone, OutErr, OutElem, OutDone>) => Channel<Env1 | Env_1, InErr & InErr1, InElem & InElem1, InDone & InDone1, OutErr1, OutElem1 | OutElem, OutDone1 | OutDone>;
```

### collect

Returns a new channel, which is the same as this one, except its outputs
are filtered and transformed by the specified partial function.

```ts
export declare const collect: <Env, InErr, InElem, InDone, OutErr, OutElem, OutElem2, OutDone>(pf: (o: OutElem) => Maybe<OutElem2>) => (self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>) => Channel<Env, InErr, InElem, InDone, OutErr, OutElem2, OutDone>;
```

### concatAll

```ts
export declare const concatAll: <Env, InErr, InElem, InDone, OutErr, OutElem>(channels: Channel<Env, InErr, InElem, InDone, OutErr, Channel<Env, InErr, InElem, InDone, OutErr, OutElem, any>, any>) => Channel<Env, InErr, InElem, InDone, OutErr, OutElem, any>;
```

### concatAllWith

Concat sequentially a channel of channels.

```ts
export declare const concatAllWith: <Env, InErr, InElem, InDone, OutErr, OutElem, OutDone, OutDone2, OutDone3, Env2, InErr2, InElem2, InDone2, OutErr2>(channels: Channel<Env, InErr, InElem, InDone, OutErr, Channel<Env2, InErr2, InElem2, InDone2, OutErr2, OutElem, OutDone>, OutDone2>, f: (o: OutDone, o1: OutDone) => OutDone, g: (o: OutDone, o2: OutDone2) => OutDone3) => Channel<Env | Env2, InErr & InErr2, InElem & InElem2, InDone & InDone2, OutErr | OutErr2, OutElem, OutDone3>;
```

### concatMap

Returns a new channel whose outputs are fed to the specified factory
function, which creates new channels in response. These new channels are
sequentially concatenated together, and all their outputs appear as outputs
of the newly returned channel.

```ts
export declare const concatMap: <OutElem, OutElem2, OutDone2, Env2, InErr2, InElem2, InDone2, OutErr2>(f: (o: OutElem) => Channel<Env2, InErr2, InElem2, InDone2, OutErr2, OutElem2, OutDone2>) => <Env_1, InErr, InElem, InDone, OutErr, OutDone>(self: Channel<Env_1, InErr, InElem, InDone, OutErr, OutElem, OutDone>) => Channel<Env2 | Env_1, InErr & InErr2, InElem & InElem2, InDone & InDone2, OutErr2 | OutErr, OutElem2, unknown>;
```

### concatMapWith

Returns a new channel whose outputs are fed to the specified factory
function, which creates new channels in response. These new channels are
sequentially concatenated together, and all their outputs appear as outputs
of the newly returned channel. The provided merging function is used to
merge the terminal values of all channels into the single terminal value of
the returned channel.

```ts
export declare const concatMapWith: <OutElem, OutElem2, OutDone, OutDone2, OutDone3, Env2, InErr2, InElem2, InDone2, OutErr2>(f: (o: OutElem) => Channel<Env2, InErr2, InElem2, InDone2, OutErr2, OutElem2, OutDone>, g: (o: OutDone, o1: OutDone) => OutDone, h: (o: OutDone, o2: OutDone2) => OutDone3) => <Env_1, InErr, InElem, InDone, OutErr>(self: Channel<Env_1, InErr, InElem, InDone, OutErr, OutElem, OutDone2>) => Channel<Env2 | Env_1, InErr & InErr2, InElem & InElem2, InDone & InDone2, OutErr2 | OutErr, OutElem2, OutDone3>;
```

### concatMapWithCustom

Returns a new channel whose outputs are fed to the specified factory
function, which creates new channels in response. These new channels are
sequentially concatenated together, and all their outputs appear as outputs
of the newly returned channel. The provided merging function is used to
merge the terminal values of all channels into the single terminal value of
the returned channel.

```ts
export declare const concatMapWithCustom: <OutElem, OutElem2, OutDone, OutDone2, OutDone3, Env2, InErr2, InElem2, InDone2, OutErr2>(f: (o: OutElem) => Channel<Env2, InErr2, InElem2, InDone2, OutErr2, OutElem2, OutDone>, g: (o: OutDone, o1: OutDone) => OutDone, h: (o: OutDone, o2: OutDone2) => OutDone3, onPull: (upstreamPullRequest: UpstreamPullRequest<OutElem>) => UpstreamPullStrategy<OutElem2>, onEmit: (elem: OutElem2) => ChildExecutorDecision) => <Env_1, InErr, InElem, InDone, OutErr>(self: Channel<Env_1, InErr, InElem, InDone, OutErr, OutElem, OutDone2>) => Channel<Env2 | Env_1, InErr & InErr2, InElem & InElem2, InDone & InDone2, OutErr2 | OutErr, OutElem2, OutDone3>;
```

### concatOut

Returns a new channel, which is the concatenation of all the channels that
are written out by this channel. This method may only be called on channels
that output other channels.

```ts
export declare const concatOut: <Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(self: Channel<Env, InErr, InElem, InDone, OutErr, Channel<Env, InErr, InElem, InDone, OutErr, OutElem, any>, OutDone>) => Channel<Env, InErr, InElem, InDone, OutErr, OutElem, any>;
```

### concrete

```ts
export declare const concrete: <Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(_: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>) => asserts _ is PipeTo<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone, any, any, any> | Read<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone, any, any> | SucceedNow<OutDone> | Fail<OutErr> | FromEffect<Env, OutErr, OutDone> | Emit<OutElem, OutDone> | Succeed<OutDone> | Suspend<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone> | Ensuring<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone> | ConcatAll<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone, any, any, any> | Fold<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone, any, any> | Bridge<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone> | BracketOut<Env, OutErr, OutElem, OutDone> | Provide<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>;
```

### concreteContinuation

```ts
export declare const concreteContinuation: <Env, InErr, InElem, InDone, OutErr, OutErr2, OutElem, OutDone, OutDone2>(_: Continuation<Env, InErr, InElem, InDone, OutErr, OutErr2, OutElem, OutDone, OutDone2>) => asserts _ is ContinuationK<Env, InErr, InElem, InDone, OutErr, OutErr2, OutElem, OutDone, OutDone2> | ContinuationFinalizer<Env, OutErr, OutDone>;
```

### contramap

```ts
export declare const contramap: <InDone0, InDone>(f: (a: InDone0) => InDone) => <Env_1, InErr, InElem, OutErr, OutElem, OutDone>(self: Channel<Env_1, InErr, InElem, InDone, OutErr, OutElem, OutDone>) => Channel<Env_1, InErr, InElem, InDone0, OutErr, OutElem, OutDone>;
```

### contramapEffect

```ts
export declare const contramapEffect: <Env1, InErr, InDone0, InDone>(f: (i: InDone0) => Effect<Env1, InErr, InDone>) => <Env_1, InElem, OutErr, OutElem, OutDone>(self: Channel<Env_1, InErr, InElem, InDone, OutErr, OutElem, OutDone>) => Channel<Env1 | Env_1, InErr, InElem, InDone0, OutErr, OutElem, OutDone>;
```

### contramapIn

```ts
export declare const contramapIn: <InElem0, InElem>(f: (a: InElem0) => InElem) => <Env_1, InErr, InDone, OutErr, OutElem, OutDone>(self: Channel<Env_1, InErr, InElem, InDone, OutErr, OutElem, OutDone>) => Channel<Env_1, InErr, InElem0, InDone, OutErr, OutElem, OutDone>;
```

### contramapInEffect

```ts
export declare const contramapInEffect: <Env1, InErr, InElem0, InElem>(f: (a: InElem0) => Effect<Env1, InErr, InElem>) => <Env_1, InDone, OutErr, OutElem, OutDone>(self: Channel<Env_1, InErr, InElem, InDone, OutErr, OutElem, OutDone>) => Channel<Env1 | Env_1, InErr, InElem0, InDone, OutErr, OutElem, OutDone>;
```

### doneCollect

Returns a new channel, which is the same as this one, except that all the
outputs are collected and bundled into a tuple together with the terminal
value of this channel.

As the channel returned from this channel collects all of this channel's
output into an in- memory chunk, it is not safe to call this method on
channels that output a large or unbounded number of values.

```ts
export declare const doneCollect: <Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>) => Channel<Env, InErr, InElem, InDone, OutErr, never, readonly [Chunk<OutElem>, OutDone]>;
```

### drain

Returns a new channel which reads all the elements from upstream's output
channel and ignores them, then terminates with the upstream result value.

```ts
export declare const drain: <Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>) => Channel<Env, InErr, InElem, InDone, OutErr, never, OutDone>;
```

### embedInput

Embed inputs from continuos pulling of a producer.

```ts
export declare const embedInput: <InErr, InElem, InDone>(input: AsyncInputProducer<InErr, InElem, InDone>) => <Env_1, OutErr, OutElem, OutDone>(self: Channel<Env_1, unknown, unknown, unknown, OutErr, OutElem, OutDone>) => Channel<Env_1, InErr, InElem, InDone, OutErr, OutElem, OutDone>;
```

### emitCollect

Returns a new channel that collects the output and terminal value of this
channel, which it then writes as output of the returned channel.

```ts
export declare const emitCollect: <Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>) => Channel<Env, InErr, InElem, InDone, OutErr, readonly [Chunk<OutElem>, OutDone], void>;
```

### ensuring

```ts
export declare const ensuring: <Env1, Z>(finalizer: Effect<Env1, never, Z>) => <Env_1, InErr, InElem, InDone, OutErr, OutElem, OutDone>(self: Channel<Env_1, InErr, InElem, InDone, OutErr, OutElem, OutDone>) => Channel<Env1 | Env_1, InErr, InElem, InDone, OutErr, OutElem, OutDone>;
```

### ensuringWith

Returns a new channel with an attached finalizer. The finalizer is
guaranteed to be executed so long as the channel begins execution (and
regardless of whether or not it completes).

```ts
export declare const ensuringWith: <Env2, OutErr, OutDone>(finalizer: (e: Exit<OutErr, OutDone>) => Effect<Env2, never, unknown>) => <Env_1, InErr, InElem, InDone, OutElem>(self: Channel<Env_1, InErr, InElem, InDone, OutErr, OutElem, OutDone>) => Channel<Env2 | Env_1, InErr, InElem, InDone, OutErr, OutElem, OutDone>;
```

### environment

Accesses the whole environment of the channel.

```ts
export declare const environment: <R>() => Channel<R, unknown, unknown, unknown, never, never, Env<R>>;
```

### environmentWith

Accesses the environment of the channel.

```ts
export declare const environmentWith: <R, OutDone>(f: (env: Env<R>) => OutDone) => Channel<R, unknown, unknown, unknown, never, never, OutDone>;
```

### environmentWithChannel

Accesses the environment of the channel in the context of a channel.

```ts
export declare const environmentWithChannel: <R, R1, InErr, InElem, InDone, OutErr, OutElem, OutDone>(f: (env: Env<R>) => Channel<R1, InErr, InElem, InDone, OutErr, OutElem, OutDone>) => Channel<R | R1, InErr, InElem, InDone, OutErr, OutElem, OutDone>;
```

### environmentWithEffect

Accesses the environment of the channel in the context of an effect.

```ts
export declare const environmentWithEffect: <R, R1, OutErr, OutDone>(f: (env: Env<R>) => Effect<R1, OutErr, OutDone>) => Channel<R | R1, unknown, unknown, unknown, OutErr, never, OutDone>;
```

### fail

Halt a channel with the specified error.

```ts
export declare const fail: <E>(e: E) => Channel<never, unknown, unknown, unknown, E, never, never>;
```

### failCause

Halt a channel with the specified cause.

```ts
export declare const failCause: <E>(cause: Cause<E>) => Channel<never, unknown, unknown, unknown, E, never, never>;
```

### failCauseSync

Halt a channel with the specified cause.

```ts
export declare const failCauseSync: <E>(cause: LazyArg<Cause<E>>) => Channel<never, unknown, unknown, unknown, E, never, never>;
```

### failSync

Halt a channel with the specified error.

```ts
export declare const failSync: <E>(e: LazyArg<E>) => Channel<never, unknown, unknown, unknown, E, never, never>;
```

### flatMap

Returns a new channel, which sequentially combines this channel, together
with the provided factory function, which creates a second channel based on
the terminal value of this channel. The result is a channel that will first
perform the functions of this channel, before performing the functions of
the created channel (including yielding its terminal value).

```ts
export declare const flatMap: <OutDone, Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone2>(f: (d: OutDone) => Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone2>) => <Env_1, InErr, InElem, InDone, OutErr, OutElem>(self: Channel<Env_1, InErr, InElem, InDone, OutErr, OutElem, OutDone>) => Channel<Env1 | Env_1, InErr & InErr1, InElem & InElem1, InDone & InDone1, OutErr1 | OutErr, OutElem1 | OutElem, OutDone2>;
```

### flatten

Returns a new channel, which flattens the terminal value of this channel.
This function may only be called if the terminal value of this channel is
another channel of compatible types.

```ts
export declare const flatten: <Env, InErr, InElem, InDone, OutErr, OutElem, Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone2>(self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone2>>) => Channel<Env | Env1, InErr & InErr1, InElem & InElem1, InDone & InDone1, OutErr | OutErr1, OutElem | OutElem1, OutDone2>;
```

### foldCauseChannel

Fold the channel exposing success and full error cause.

```ts
export declare const foldCauseChannel: <Env1, Env2, InErr1, InErr2, InElem1, InElem2, InDone1, InDone2, OutErr, OutErr2, OutErr3, OutElem1, OutElem2, OutDone, OutDone2, OutDone3>(onErr: (c: Cause<OutErr>) => Channel<Env1, InErr1, InElem1, InDone1, OutErr2, OutElem1, OutDone2>, onSucc: (o: OutDone) => Channel<Env2, InErr2, InElem2, InDone2, OutErr3, OutElem2, OutDone3>) => <Env_1, InErr, InElem, InDone, OutElem>(self: Channel<Env_1, InErr, InElem, InDone, OutErr, OutElem, OutDone>) => Channel<Env1 | Env2 | Env_1, InErr & InErr1 & InErr2, InElem & InElem1 & InElem2, InDone & InDone1 & InDone2, OutErr2 | OutErr3, OutElem1 | OutElem2 | OutElem, OutDone2 | OutDone3>;
```

### foldChannel

```ts
export declare const foldChannel: <Env1, Env2, InErr1, InErr2, InElem1, InElem2, InDone1, InDone2, OutErr, OutErr1, OutErr2, OutElem1, OutElem2, OutDone, OutDone1, OutDone2>(onErr: (oErr: OutErr) => Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>, onSucc: (oErr: OutDone) => Channel<Env2, InErr2, InElem2, InDone2, OutErr2, OutElem2, OutDone2>) => <Env_1, InErr, InElem, InDone, OutElem>(self: Channel<Env_1, InErr, InElem, InDone, OutErr, OutElem, OutDone>) => Channel<Env1 | Env2 | Env_1, InErr & InErr1 & InErr2, InElem & InElem1 & InElem2, InDone & InDone1 & InDone2, OutErr1 | OutErr2, OutElem1 | OutElem2 | OutElem, OutDone1 | OutDone2>;
```

### fromEffect

Use an effect to end a channel.

```ts
export declare const fromEffect: <R, E, A>(effect: Effect<R, E, A>) => Channel<R, unknown, unknown, unknown, E, never, A>;
```

### fromEither

```ts
export declare const fromEither: <E, A>(either: Either<E, A>) => Channel<never, unknown, unknown, unknown, E, never, A>;
```

### fromHub

```ts
export declare const fromHub: <Err, Done, Elem>(hub: Hub<Either<Exit<Err, Done>, Elem>>) => Channel<never, unknown, unknown, unknown, Err, Elem, Done>;
```

### fromHubScoped

```ts
export declare const fromHubScoped: <Err, Done, Elem>(hub: Hub<Either<Exit<Err, Done>, Elem>>) => Effect<Scope, never, Channel<never, unknown, unknown, unknown, Err, Elem, Done>>;
```

### fromInput

```ts
export declare const fromInput: <Err, Elem, Done>(input: AsyncInputConsumer<Err, Elem, Done>) => Channel<never, unknown, unknown, unknown, Err, Elem, Done>;
```

### fromMaybe

```ts
export declare const fromMaybe: <A>(option: Maybe<A>) => Channel<never, unknown, unknown, unknown, Maybe<never>, never, A>;
```

### fromQueue

```ts
export declare const fromQueue: <Err, Elem, Done>(queue: Dequeue<Either<Exit<Err, Done>, Elem>>) => Channel<never, unknown, unknown, unknown, Err, Elem, Done>;
```

### identity

```ts
export declare const identity: <Err, Elem, Done>() => Channel<never, Err, Elem, Done, Err, Elem, Done>;
```

### interruptAs

```ts
export declare const interruptAs: (fiberId: FiberId) => Channel<never, unknown, unknown, unknown, never, never, never>;
```

### interruptWhen

Returns a new channel, which is the same as this one, except it will be
interrupted when the specified effect completes. If the effect completes
successfully before the underlying channel is done, then the returned
channel will yield the success value of the effect as its terminal value.
On the other hand, if the underlying channel finishes first, then the
returned channel will yield the success value of the underlying channel as
its terminal value.

```ts
export declare const interruptWhen: <Env1, OutErr1, OutDone1>(io: Effect<Env1, OutErr1, OutDone1>) => <Env_1, InErr, InElem, InDone, OutErr, OutElem, OutDone>(self: Channel<Env_1, InErr, InElem, InDone, OutErr, OutElem, OutDone>) => Channel<Env1 | Env_1, InErr, InElem, InDone, OutErr1 | OutErr, OutElem, OutDone1 | OutDone>;
```

### interruptWhenDeferred

Returns a new channel, which is the same as this one, except it will be
interrupted when the specified deferred is completed. If the deferred is
completed before the underlying channel is done, then the returned channel
will yield the value of the deferred. Otherwise, if the underlying channel
finishes first, then the returned channel will yield the value of the
underlying channel.

```ts
export declare const interruptWhenDeferred: <OutErr1, OutDone1>(deferred: Deferred<OutErr1, OutDone1>) => <Env_1, InErr, InElem, InDone, OutErr, OutElem, OutDone>(self: Channel<Env_1, InErr, InElem, InDone, OutErr, OutElem, OutDone>) => Channel<Env_1, InErr, InElem, InDone, OutErr1 | OutErr, OutElem, OutDone1 | OutDone>;
```

### map

Returns a new channel, which is the same as this one, except the terminal
value of the returned channel is created by applying the specified function
to the terminal value of this channel.

```ts
export declare const map: <OutDone, OutDone2>(f: (out: OutDone) => OutDone2) => <Env_1, InErr, InElem, InDone, OutErr, OutElem>(self: Channel<Env_1, InErr, InElem, InDone, OutErr, OutElem, OutDone>) => Channel<Env_1, InErr, InElem, InDone, OutErr, OutElem, OutDone2>;
```

### mapEffect

Returns a new channel, which is the same as this one, except the terminal
value of the returned channel is created by applying the specified
effectful function to the terminal value of this channel.

```ts
export declare const mapEffect: <Env1, OutErr1, OutDone, OutDone1>(f: (o: OutDone) => Effect<Env1, OutErr1, OutDone1>) => <Env_1, InErr, InElem, InDone, OutErr, OutElem>(self: Channel<Env_1, InErr, InElem, InDone, OutErr, OutElem, OutDone>) => Channel<Env1 | Env_1, InErr, InElem, InDone, OutErr1 | OutErr, OutElem, OutDone1>;
```

### mapError

Returns a new channel, which is the same as this one, except the failure
value of the returned channel is created by applying the specified function
to the failure value of this channel.

```ts
export declare const mapError: <OutErr, OutErr2>(f: (err: OutErr) => OutErr2) => <Env_1, InErr, InElem, InDone, OutElem, OutDone>(self: Channel<Env_1, InErr, InElem, InDone, OutErr, OutElem, OutDone>) => Channel<Env_1, InErr, InElem, InDone, OutErr2, OutElem, OutDone>;
```

### mapErrorCause

A more powerful version of `mapError` which also surfaces the `Cause`
of the channel failure.

```ts
export declare const mapErrorCause: <OutErr, OutErr2>(f: (cause: Cause<OutErr>) => Cause<OutErr2>) => <Env_1, InErr, InElem, InDone, OutElem, OutDone>(self: Channel<Env_1, InErr, InElem, InDone, OutErr, OutElem, OutDone>) => Channel<Env_1, InErr, InElem, InDone, OutErr2, OutElem, OutDone>;
```

### mapOut

Maps the output of this channel using the specified function.

```ts
export declare const mapOut: <OutElem, OutElem2>(f: (o: OutElem) => OutElem2) => <Env_1, InErr, InElem, InDone, OutErr, OutDone>(self: Channel<Env_1, InErr, InElem, InDone, OutErr, OutElem, OutDone>) => Channel<Env_1, InErr, InElem, InDone, OutErr, OutElem2, OutDone>;
```

### mapOutEffect

```ts
export declare const mapOutEffect: <OutElem, Env1, OutErr1, OutElem1>(f: (o: OutElem) => Effect<Env1, OutErr1, OutElem1>) => <Env_1, InErr, InElem, InDone, OutErr, OutDone>(self: Channel<Env_1, InErr, InElem, InDone, OutErr, OutElem, OutDone>) => Channel<Env1 | Env_1, InErr, InElem, InDone, OutErr1 | OutErr, OutElem1, OutDone>;
```

### mapOutEffectPar

```ts
export declare const mapOutEffectPar: <OutElem, Env1, OutErr1, OutElem1>(n: number, f: (o: OutElem) => Effect<Env1, OutErr1, OutElem1>) => <Env_1, InErr, InElem, InDone, OutErr, OutDone>(self: Channel<Env_1, InErr, InElem, InDone, OutErr, OutElem, OutDone>) => Channel<Env1 | Env_1, InErr, InElem, InDone, OutErr1 | OutErr, OutElem1, OutDone>;
```

### mergeAll

```ts
export declare const mergeAll: <Env, Env1, InErr, InErr1, InElem, InElem1, InDone, InDone1, OutErr, OutErr1, OutElem>(channels: Channel<Env, InErr, InElem, InDone, OutErr, Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem, unknown>, unknown>, n: number, bufferSize?: number, mergeStrategy?: MergeStrategy) => Channel<Env | Env1, InErr & InErr1, InElem & InElem1, InDone & InDone1, OutErr | OutErr1, OutElem, unknown>;
```

### mergeAllUnbounded

```ts
export declare const mergeAllUnbounded: <Env, Env1, InErr, InErr1, InElem, InElem1, InDone, InDone1, OutErr, OutErr1, OutElem>(channels: Channel<Env, InErr, InElem, InDone, OutErr, Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem, unknown>, unknown>) => Channel<Env | Env1, InErr & InErr1, InElem & InElem1, InDone & InDone1, OutErr | OutErr1, OutElem, unknown>;
```

### mergeAllUnboundedWith

```ts
export declare const mergeAllUnboundedWith: <Env, Env1, InErr, InErr1, InElem, InElem1, InDone, InDone1, OutErr, OutErr1, OutElem, OutDone>(channels: Channel<Env, InErr, InElem, InDone, OutErr, Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem, OutDone>, OutDone>, f: (o1: OutDone, o2: OutDone) => OutDone) => Channel<Env | Env1, InErr & InErr1, InElem & InElem1, InDone & InDone1, OutErr | OutErr1, OutElem, OutDone>;
```

### mergeAllWith

```ts
export declare const mergeAllWith: <Env, Env1, InErr, InErr1, InElem, InElem1, InDone, InDone1, OutErr, OutErr1, OutElem, OutDone>(channels: Channel<Env, InErr, InElem, InDone, OutErr, Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem, OutDone>, OutDone>, n: number, f: (o1: OutDone, o2: OutDone) => OutDone, bufferSize?: number, mergeStrategy?: MergeStrategy) => Channel<Env | Env1, InErr & InErr1, InElem & InElem1, InDone & InDone1, OutErr | OutErr1, OutElem, OutDone>;
```

### mergeMap

```ts
export declare const mergeMap: <OutElem, Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, Z>(n: number, f: (outElem: OutElem) => Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, Z>, bufferSize?: number, mergeStrategy?: MergeStrategy) => <Env_1, InErr, InElem, InDone, OutErr, OutDone>(self: Channel<Env_1, InErr, InElem, InDone, OutErr, OutElem, OutDone>) => Channel<Env1 | Env_1, InErr & InErr1, InElem & InElem1, InDone & InDone1, OutErr1 | OutErr, OutElem1, unknown>;
```

### mergeOut

```ts
export declare const mergeOut: (n: number) => <Env_1, Env1, InErr, InErr1, InElem, InElem1, InDone, InDone1, OutErr, OutErr1, OutElem1, OutDone, Z>(self: Channel<Env_1, InErr, InElem, InDone, OutErr, Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, Z>, OutDone>) => Channel<Env_1 | Env1, InErr & InErr1, InElem & InElem1, InDone & InDone1, OutErr | OutErr1, OutElem1, unknown>;
```

### mergeOutWith

```ts
export declare const mergeOutWith: <OutDone1>(n: number, f: (o1: OutDone1, o2: OutDone1) => OutDone1) => <Env_1, Env1, InErr, InErr1, InElem, InElem1, InDone, InDone1, OutErr, OutErr1, OutElem1>(self: Channel<Env_1, InErr, InElem, InDone, OutErr, Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>, OutDone1>) => Channel<Env_1 | Env1, InErr & InErr1, InElem & InElem1, InDone & InDone1, OutErr | OutErr1, OutElem1, OutDone1>;
```

### mergeWith_

Returns a new channel, which is the merge of this channel and the specified
channel, where the behavior of the returned channel on left or right early
termination is decided by the specified `leftDone` and `rightDone` merge
decisions.

```ts
export declare const mergeWith_: <Env1, InErr1, InElem1, InDone1, OutErr, OutErr1, OutErr2, OutErr3, OutElem1, OutDone, OutDone1, OutDone2, OutDone3>(that: Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>, leftDone: (ex: Exit<OutErr, OutDone>) => MergeDecision<Env1, OutErr1, OutDone1, OutErr2, OutDone2>, rightDone: (ex: Exit<OutErr1, OutDone1>) => MergeDecision<Env1, OutErr, OutDone, OutErr3, OutDone3>) => <Env_1, InErr, InElem, InDone, OutElem>(self: Channel<Env_1, InErr, InElem, InDone, OutErr, OutElem, OutDone>) => Channel<Env1 | Env_1, InErr & InErr1, InElem & InElem1, InDone & InDone1, OutErr2 | OutErr3, OutElem1 | OutElem, OutDone2 | OutDone3>;
```

### never

```ts
export declare const never: Channel<never, unknown, unknown, unknown, never, never, never>;
```

### orDie

```ts
export declare const orDie: <E>(error: LazyArg<E>) => <Env_1, InErr, InElem, InDone, OutErr, OutElem, OutDone>(self: Channel<Env_1, InErr, InElem, InDone, OutErr, OutElem, OutDone>) => Channel<Env_1, InErr, InElem, InDone, never, OutElem, OutDone>;
```

### orDieWith

```ts
export declare const orDieWith: <OutErr>(f: (e: OutErr) => unknown) => <Env_1, InErr, InElem, InDone, OutElem, OutDone>(self: Channel<Env_1, InErr, InElem, InDone, OutErr, OutElem, OutDone>) => Channel<Env_1, InErr, InElem, InDone, never, OutElem, OutDone>;
```

### orElse

Returns a new channel that will perform the operations of this one, until
failure, and then it will switch over to the operations of the specified
fallback channel.

```ts
export declare const orElse: <Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>(that: LazyArg<Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>>) => <Env_1, InErr, InElem, InDone, OutErr, OutElem, OutDone>(self: Channel<Env_1, InErr, InElem, InDone, OutErr, OutElem, OutDone>) => Channel<Env1 | Env_1, InErr & InErr1, InElem & InElem1, InDone & InDone1, OutErr1, OutElem1 | OutElem, OutDone1 | OutDone>;
```

### pipeTo

Pipe the output of a channel into the input of another.

```ts
export declare const pipeTo: <Env2, OutErr, OutElem, OutDone, OutErr2, OutElem2, OutDone2>(that: Channel<Env2, OutErr, OutElem, OutDone, OutErr2, OutElem2, OutDone2>) => <Env_1, InErr, InElem, InDone>(self: Channel<Env_1, InErr, InElem, InDone, OutErr, OutElem, OutDone>) => Channel<Env2 | Env_1, InErr, InElem, InDone, OutErr2, OutElem2, OutDone2>;
```

### pipeToOrFail

```ts
export declare const pipeToOrFail: <Env2, OutElem, OutDone, OutErr2, OutElem2, OutDone2>(that: Channel<Env2, never, OutElem, OutDone, OutErr2, OutElem2, OutDone2>) => <Env_1, InErr, InElem, InDone, OutErr>(self: Channel<Env_1, InErr, InElem, InDone, OutErr, OutElem, OutDone>) => Channel<Env2 | Env_1, InErr, InElem, InDone, OutErr2, OutElem2, OutDone2>;
```

### provideEnvironment

Provides the channel with its required environment, which eliminates its
dependency on `Env`.

```ts
export declare const provideEnvironment: <R>(env: Env<R>) => <InErr, InElem, InDone, OutErr, OutElem, OutDone>(self: Channel<R, InErr, InElem, InDone, OutErr, OutElem, OutDone>) => Channel<never, InErr, InElem, InDone, OutErr, OutElem, OutDone>;
```

### provideLayer

Provides a layer to the channel, which translates it to another level.

```ts
export declare const provideLayer: <R0, R, OutErr2>(layer: Layer<R0, OutErr2, R>) => <InErr, InElem, InDone, OutErr, OutElem, OutDone>(self: Channel<R, InErr, InElem, InDone, OutErr, OutElem, OutDone>) => Channel<R0, InErr, InElem, InDone, OutErr2 | OutErr, OutElem, OutDone>;
```

### provideService

Provides the effect with the single service it requires. If the effect
requires more than one service use `provideEnvironment` instead.

```ts
export declare const provideService: <T, T1 extends T>(tag: Tag<T>, service: T1) => <R, InErr, InElem, InDone, OutErr, OutElem, OutDone>(self: Channel<R, InErr, InElem, InDone, OutErr, OutElem, OutDone>) => Channel<Exclude<R, T>, InErr, InElem, InDone, OutErr, OutElem, OutDone>;
```

### provideSomeEnvironment

Transforms the environment being provided to the channel with the specified
function.

```ts
export declare const provideSomeEnvironment: <R0, R>(f: (env: Env<R0>) => Env<R>) => <InErr, InElem, InDone, OutErr, OutElem, OutDone>(self: Channel<R, InErr, InElem, InDone, OutErr, OutElem, OutDone>) => Channel<R0, InErr, InElem, InDone, OutErr, OutElem, OutDone>;
```

### provideSomeLayer

Splits the environment into two parts, providing one part using the
specified layer and leaving the remainder `Env0`.

```ts
export declare const provideSomeLayer: <R0, R2, OutErr2>(layer: Layer<R0, OutErr2, R2>) => <R, InErr, InElem, InDone, OutErr, OutElem, OutDone>(self: Channel<R, InErr, InElem, InDone, OutErr, OutElem, OutDone>) => Channel<R0 | Exclude<R, R2>, InErr, InElem, InDone, OutErr2 | OutErr, OutElem, OutDone>;
```

### read

```ts
export declare const read: <In>() => Channel<never, unknown, In, unknown, Maybe<never>, never, In>;
```

### readOrFail

```ts
export declare const readOrFail: <In, E>(e: E) => Channel<never, unknown, In, unknown, E, never, In>;
```

### readWith

Reads an input and continue exposing both error and completion.

```ts
export declare const readWith: <Env, Env1, Env2, InErr, InElem, InDone, OutErr, OutErr1, OutErr2, OutElem, OutElem1, OutElem2, OutDone, OutDone1, OutDone2>(input: (i: InElem) => Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>, error: (e: InErr) => Channel<Env1, InErr, InElem, InDone, OutErr1, OutElem1, OutDone1>, done: (d: InDone) => Channel<Env2, InErr, InElem, InDone, OutErr2, OutElem2, OutDone2>) => Channel<Env | Env1 | Env2, InErr, InElem, InDone, OutErr | OutErr1 | OutErr2, OutElem | OutElem1 | OutElem2, OutDone | OutDone1 | OutDone2>;
```

### readWithCause

Reads an input and continue exposing both full error cause and completion.

```ts
export declare const readWithCause: <Env, Env1, Env2, InErr, InElem, InDone, OutErr, OutErr1, OutErr2, OutElem, OutElem1, OutElem2, OutDone, OutDone1, OutDone2>(input: (i: InElem) => Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>, halt: (e: Cause<InErr>) => Channel<Env1, InErr, InElem, InDone, OutErr1, OutElem1, OutDone1>, done: (d: InDone) => Channel<Env2, InErr, InElem, InDone, OutErr2, OutElem2, OutDone2>) => Channel<Env | Env1 | Env2, InErr, InElem, InDone, OutErr | OutErr1 | OutErr2, OutElem | OutElem1 | OutElem2, OutDone | OutDone1 | OutDone2>;
```

### repeated

Repeats this channel forever.

```ts
export declare const repeated: <Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>) => Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>;
```

### run

Runs a channel until the end is received.

```ts
export declare const run: <Env, InErr, InDone, OutErr, OutDone>(self: Channel<Env, InErr, unknown, InDone, OutErr, never, OutDone>) => Effect<Env, OutErr, OutDone>;
```

### runCollect

```ts
export declare const runCollect: <Env, InErr, InDone, OutErr, OutElem, OutDone>(self: Channel<Env, InErr, unknown, InDone, OutErr, OutElem, OutDone>) => Effect<Env, OutErr, readonly [Chunk<OutElem>, OutDone]>;
```

### runDrain

Runs a channel until the end is received.

```ts
export declare const runDrain: <Env, InErr, InDone, OutElem, OutErr, OutDone>(self: Channel<Env, InErr, unknown, InDone, OutErr, OutElem, OutDone>) => Effect<Env, OutErr, OutDone>;
```

### runScoped

Runs a channel until the end is received.

```ts
export declare const runScoped: <Env, InErr, InDone, OutErr, OutDone>(self: Channel<Env, InErr, unknown, InDone, OutErr, never, OutDone>) => Effect<Scope | Env, OutErr, OutDone>;
```

### scoped

Use a scoped effect to emit an output element.

```ts
export declare const scoped: <R, E, A>(effect: Effect<R, E, A>) => Channel<Exclude<R, Scope>, unknown, unknown, unknown, E, A, unknown>;
```

### service

Accesses the specified service in the environment of the channel.

```ts
export declare const service: <T>(tag: Tag<T>) => Channel<T, unknown, unknown, unknown, never, never, T>;
```

### serviceWith

Accesses the specified service in the environment of the channel.

```ts
export declare const serviceWith: <T, OutDone>(tag: Tag<T>, f: (resource: T) => OutDone) => Channel<T, unknown, unknown, unknown, never, never, OutDone>;
```

### serviceWithChannel

Accesses the specified service in the environment of the channel in the
context of a channel.

```ts
export declare const serviceWithChannel: <T, Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(tag: Tag<T>, f: (resource: T) => Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>) => Channel<T | Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>;
```

### serviceWithEffect

Accesses the specified service in the environment of the channel in the
context of an effect.

```ts
export declare const serviceWithEffect: <T, Env, OutErr, OutDone>(tag: Tag<T>, f: (resource: T) => Effect<Env, OutErr, OutDone>) => Channel<T | Env, unknown, unknown, unknown, OutErr, never, OutDone>;
```

### succeed

```ts
export declare const succeed: <OutDone>(result: OutDone) => Channel<never, unknown, unknown, unknown, never, never, OutDone>;
```

### succeedWith

```ts
export declare const succeedWith: <R, Z>(f: (env: Env<R>) => Z) => Channel<R, unknown, unknown, unknown, never, never, Z>;
```

### suspend

```ts
export declare const suspend: <Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(effect: LazyArg<Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>>) => Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>;
```

### sync

```ts
export declare const sync: <OutDone>(effect: LazyArg<OutDone>) => Channel<never, unknown, unknown, unknown, never, never, OutDone>;
```

### toHub

```ts
export declare const toHub: <Err, Done, Elem>(hub: Hub<Either<Exit<Err, Done>, Elem>>) => Channel<never, Err, Elem, Done, never, never, unknown>;
```

### toPull

Interpret a `Channel` to a managed pull.

```ts
export declare const toPull: <Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>) => Effect<Scope | Env, never, Effect<Env, OutErr, Either<OutDone, OutElem>>>;
```

### toQueue

```ts
export declare const toQueue: <Err, Done, Elem>(queue: Enqueue<Either<Exit<Err, Done>, Elem>>) => Channel<never, Err, Elem, Done, never, never, unknown>;
```

### toSink

```ts
export declare const toSink: <Env, InErr, InElem, OutErr, OutElem, OutDone>(self: Channel<Env, InErr, Chunk<InElem>, unknown, OutErr, Chunk<OutElem>, OutDone>) => Sink<Env, OutErr, InElem, OutElem, OutDone>;
```

### toStream

```ts
export declare const toStream: <Env, OutErr, OutElem, OutDone>(self: Channel<Env, unknown, unknown, unknown, OutErr, Chunk<OutElem>, OutDone>) => Stream<Env, OutErr, OutElem>;
```

### unifyChannel

```ts
export declare const unifyChannel: <X extends Channel<any, any, any, any, any, any, any>>(self: X) => Channel<[X] extends [{ [_Env]: () => infer Env; }] ? Env : never, [X] extends [{ [_InErr]: (_: infer InErr) => void; }] ? InErr : never, [X] extends [{ [_InElem]: (_: infer InElem) => void; }] ? InElem : never, [X] extends [{ [_InDone]: (_: infer InDone) => void; }] ? InDone : never, [X] extends [{ [_OutErr]: () => infer OutErr; }] ? OutErr : never, [X] extends [{ [_OutElem]: () => infer OutElem; }] ? OutElem : never, [X] extends [{ [_OutDone]: () => infer OutDone; }] ? OutDone : never>;
```

### unit

```ts
export declare const unit: Channel<never, unknown, unknown, unknown, never, never, void>;
```

### unit_

Ignores the result of the effect replacing it with a void

```ts
export declare const unit_: <Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>) => Channel<Env, InErr, InElem, InDone, OutErr, OutElem, void>;
```

### unwrap

Makes a channel from an effect that returns a channel in case of success.

```ts
export declare const unwrap: <R, E, R2, InErr, InElem, InDone, OutErr, OutElem, OutDone>(channel: Effect<R, E, Channel<R2, InErr, InElem, InDone, OutErr, OutElem, OutDone>>) => Channel<R | R2, InErr, InElem, InDone, E | OutErr, OutElem, OutDone>;
```

### unwrapScoped

Makes a channel from a managed that returns a channel in case of success.

```ts
export declare const unwrapScoped: <R, E, Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(self: Effect<R, E, Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>>) => Channel<Env | Exclude<R, Scope>, InErr, InElem, InDone, E | OutErr, OutElem, OutDone>;
```

### updateService

Updates a service in the environment of this channel.

```ts
export declare const updateService: <T, T1 extends T>(tag: Tag<T>, f: (resource: T) => T1) => <R, InErr, InDone, OutElem, OutErr, OutDone>(self: Channel<R, InErr, unknown, InDone, OutErr, OutElem, OutDone>) => Channel<T | R, InErr, unknown, InDone, OutErr, OutElem, OutDone>;
```

### write

Writes an output to the channel.

```ts
export declare const write: <OutElem>(out: OutElem) => Channel<never, unknown, unknown, unknown, never, OutElem, void>;
```

### writeAll

```ts
export declare const writeAll: <Out>(...outs: Out[]) => Channel<never, unknown, unknown, unknown, never, Out, void>;
```

### writeChunk

```ts
export declare const writeChunk: <Out>(outs: Chunk<Out>) => Channel<never, unknown, unknown, unknown, never, Out, void>;
```

### zip

Returns a new channel that is the sequential composition of this channel
and the specified channel. The returned channel terminates with a tuple of
the terminal values of both channels.

```ts
export declare const zip: <Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>(that: Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>) => <Env_1, InErr, InElem, InDone, OutErr, OutElem, OutDone>(self: Channel<Env_1, InErr, InElem, InDone, OutErr, OutElem, OutDone>) => Channel<Env1 | Env_1, InErr & InErr1, InElem & InElem1, InDone & InDone1, OutErr1 | OutErr, OutElem1 | OutElem, readonly [OutDone, OutDone1]>;
```

### zipFlatten

Returns a new channel that is the sequential composition of this channel
and the specified channel. The returned channel terminates with a flattened
tuple of the terminal values of both channels.

```ts
export declare const zipFlatten: <Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>(that: Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>) => <Env_1, InErr, InElem, InDone, OutErr, OutElem, OutDone extends readonly any[]>(self: Channel<Env_1, InErr, InElem, InDone, OutErr, OutElem, OutDone>) => Channel<Env1 | Env_1, InErr & InErr1, InElem & InElem1, InDone & InDone1, OutErr1 | OutErr, OutElem1 | OutElem, readonly [...OutDone, OutDone1]>;
```

### zipLeft

Returns a new channel that is the sequential composition of this channel
and the specified channel. The returned channel terminates with the
terminal value of this channel.

```ts
export declare const zipLeft: <Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>(that: Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>) => <Env_1, InErr, InElem, InDone, OutErr, OutElem, OutDone>(self: Channel<Env_1, InErr, InElem, InDone, OutErr, OutElem, OutDone>) => Channel<Env1 | Env_1, InErr & InErr1, InElem & InElem1, InDone & InDone1, OutErr1 | OutErr, OutElem1 | OutElem, OutDone>;
```

### zipPar

```ts
export declare const zipPar: <Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>(that: Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>) => <Env_1, InErr, InElem, InDone, OutErr, OutElem, OutDone>(self: Channel<Env_1, InErr, InElem, InDone, OutErr, OutElem, OutDone>) => Channel<Env1 | Env_1, InErr & InErr1, InElem & InElem1, InDone & InDone1, OutErr1 | OutErr, OutElem1 | OutElem, readonly [OutDone, OutDone1]>;
```

### zipParLeft

```ts
export declare const zipParLeft: <Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>(that: Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>) => <Env_1, InErr, InElem, InDone, OutErr, OutElem, OutDone>(self: Channel<Env_1, InErr, InElem, InDone, OutErr, OutElem, OutDone>) => Channel<Env1 | Env_1, InErr & InErr1, InElem & InElem1, InDone & InDone1, OutErr1 | OutErr, OutElem1 | OutElem, OutDone>;
```

### zipParRight

```ts
export declare const zipParRight: <Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>(that: Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>) => <Env_1, InErr, InElem, InDone, OutErr, OutElem, OutDone>(self: Channel<Env_1, InErr, InElem, InDone, OutErr, OutElem, OutDone>) => Channel<Env1 | Env_1, InErr & InErr1, InElem & InElem1, InDone & InDone1, OutErr1 | OutErr, OutElem1 | OutElem, OutDone1>;
```

### zipRight

Returns a new channel that is the sequential composition of this channel
and the specified channel. The returned channel terminates with the
terminal value of that channel.

```ts
export declare const zipRight: <Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>(that: Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>) => <Env_1, InErr, InElem, InDone, OutErr, OutElem, OutDone>(self: Channel<Env_1, InErr, InElem, InDone, OutErr, OutElem, OutDone>) => Channel<Env1 | Env_1, InErr & InErr1, InElem & InElem1, InDone & InDone1, OutErr1 | OutErr, OutElem1 | OutElem, OutDone1>;
```

### zipWith

Returns a new channel that is the sequential composition of this channel
and the specified channel. The returned channel terminates with the result
of calling the specified function on the terminal values of both channels.

```ts
export declare const zipWith: <Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone, OutDone1, OutDone2>(that: Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>, f: (outDone: OutDone, outDone1: OutDone1) => OutDone2) => <Env_1, InErr, InElem, InDone, OutErr, OutElem>(self: Channel<Env_1, InErr, InElem, InDone, OutErr, OutElem, OutDone>) => Channel<Env1 | Env_1, InErr & InErr1, InElem & InElem1, InDone & InDone1, OutErr1 | OutErr, OutElem1 | OutElem, OutDone2>;
```

