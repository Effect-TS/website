## Layer

Reference Documentation for the module '@effect/io/Layer'

A `Layer<RIn, E, ROut>` describes how to build one or more services in your
application. Services can be injected into effects via `Effect.provide`.
Effects can require services via `Effect.service`.

Layer can be thought of as recipes for producing bundles of services, given
their dependencies (other services).

Construction of services can be effectful and utilize resources that must be
acquired and safely released when the services are done being utilized.

By default layers are shared, meaning that if the same layer is used twice
the layer will only be allocated a single time.

Because of their excellent composition properties, layers are the idiomatic
way in Effect-TS to create services that depend on other services.

```ts
export interface Layer<RIn, E, ROut> {
    readonly [_RIn]: () => RIn;
    readonly [_E]: () => E;
    readonly [_ROut]: (_: ROut) => void;
    readonly [LayerTypeId]: LayerTypeId;
}
```

## Methods

### build

Builds a layer into a scoped value.

```ts
export declare const build: <RIn, E, ROut>(self: Layer<RIn, E, ROut>) => Effect<Scope | RIn, E, Env<ROut>>;
```

### buildWithScope

Builds a layer into an Effect value. Any resources associated with this layer
will be released when the specified scope is closed unless their scope has
been extended. This allows building layers where the lifetime of some of
the services output by the layer exceed the lifetime of the effect the
layer is provided to.

```ts
export declare const buildWithScope: (scope: Scope) => <RIn, E, ROut>(self: Layer<RIn, E, ROut>) => Effect<RIn, E, Env<ROut>>;
```

### catchAll

Recovers from all errors.

```ts
export declare const catchAll: <E, R2, E2, A2>(handler: (e: E) => Layer<R2, E2, A2>) => <R, A>(self: Layer<R, E, A>) => Layer<R2 | R, E2, A & A2>;
```

### die

Constructs a layer that dies with the specified throwable.

```ts
export declare const die: (defect: LazyArg<unknown>) => Layer<never, never, unknown>;
```

### environment

Constructs a `Layer` that passes along the specified environment as an
output.

```ts
export declare const environment: <R>() => Layer<R, never, R>;
```

### extendScope

Extends the scope of this layer, returning a new layer that when provided
to an effect will not immediately release its associated resources when
that effect completes execution but instead when the scope the resulting
effect depends on is closed.

```ts
export declare const extendScope: <RIn, E, ROut>(self: Layer<RIn, E, ROut>) => Layer<Scope | RIn, E, ROut>;
```

### fail

Constructs a layer that fails with the specified error.

```ts
export declare const fail: <E>(e: LazyArg<E>) => Layer<never, E, unknown>;
```

### failCause

Constructs a layer that fails with the specified cause.

```ts
export declare const failCause: <E>(cause: LazyArg<Cause<E>>) => Layer<never, E, unknown>;
```

### flatMap

Constructs a layer dynamically based on the output of this layer.

```ts
export declare const flatMap: <A, R2, E2, A2>(f: (a: Env<A>) => Layer<R2, E2, A2>) => <R, E>(self: Layer<R, E, A>) => Layer<R2 | R, E2 | E, A2>;
```

### flatten

Flattens nested layers.

```ts
export declare const flatten: <R2, E2, A>(tag: Tag<Layer<R2, E2, A>>) => <R, E>(self: Layer<R, E, Layer<R2, E2, A>>) => Layer<R2 | R, E2 | E, A>;
```

### foldCauseLayer

Feeds the error or output services of this layer into the input of either
the specified `failure` or `success` layers, resulting in a new layer with
the inputs of this layer, and the error or outputs of the specified layer.

```ts
export declare const foldCauseLayer: <E, A, R2, E2, A2, R3, E3, A3>(failure: (cause: Cause<E>) => Layer<R2, E2, A2>, success: (env: Env<A>) => Layer<R3, E3, A3>) => <R>(self: Layer<R, E, A>) => Layer<R2 | R3 | R, E2 | E3, A2 | A3>;
```

### foldLayer

Feeds the error or output services of this layer into the input of either
the specified `failure` or `success` layers, resulting in a new layer with
the inputs of this layer, and the error or outputs of the specified layer.

```ts
export declare const foldLayer: <E, R2, E2, A2, A, R3, E3, A3>(failure: (e: E) => Layer<R2, E2, A2>, success: (a: Env<A>) => Layer<R3, E3, A3>) => <R>(self: Layer<R, E, A>) => Layer<R2 | R3 | R, E2 | E3, A2 & A3>;
```

### fresh

Creates a fresh version of this layer that will not be shared.

```ts
export declare const fresh: <R, E, A>(self: Layer<R, E, A>) => Layer<R, E, A>;
```

### fromEffect

Constructs a layer from the specified effect.

```ts
export declare const fromEffect: <T>(tag: Tag<T>) => <R, E>(effect: Effect<R, E, T>) => Layer<R, E, T>;
```

### fromEffectEnvironment

Constructs a layer from the specified effect, which must return one or more
services.

```ts
export declare const fromEffectEnvironment: <R, E, A>(effect: Effect<R, E, Env<A>>) => Layer<R, E, A>;
```

### fromFunction

Constructs a layer from the environment using the specified function.

```ts
export declare const fromFunction: <A, B>(tagA: Tag<A>, tagB: Tag<B>, f: (a: A) => B) => Layer<A, never, B>;
```

### fromValue

Construct a service layer from a value

```ts
export declare const fromValue: <T, T1 extends T>(tag: Tag<T>, service: LazyArg<T1>) => Layer<never, never, T>;
```

### instruction

```ts
export declare const instruction: <R, E, A>(self: Layer<R, E, A>) => Instruction;
```

### isFresh

Returns whether this layer is a fresh version that will not be shared.

```ts
export declare const isFresh: <R, E, A>(self: Layer<R, E, A>) => boolean;
```

### launch

Builds this layer and uses it until it is interrupted. This is useful when
your entire application is a layer, such as an HTTP server.

```ts
export declare const launch: <RIn, E, ROut>(self: Layer<RIn, E, ROut>) => Effect<RIn, E, never>;
```

### makeMemoMap

Creates an empty `MemoMap`.

```ts
export declare const makeMemoMap: () => Effect<never, never, MemoMap>;
```

### map

Returns a new layer whose output is mapped by the specified function.

```ts
export declare const map: <A, B>(f: (a: Env<A>) => Env<B>) => <R, E>(self: Layer<R, E, A>) => Layer<R, E, B>;
```

### mapError

Returns a layer with its error channel mapped using the specified function.

```ts
export declare const mapError: <E, E1>(f: (e: E) => E1) => <R, A>(self: Layer<R, E, A>) => Layer<R, E1, A>;
```

### memoize

Returns a scoped effect that, if evaluated, will return the lazily computed
result of this layer.

```ts
export declare const memoize: <RIn, E, ROut>(self: Layer<RIn, E, ROut>) => Effect<Scope, never, Layer<RIn, E, ROut>>;
```

### merge

Combines this layer with the specified layer, producing a new layer that
has the inputs and outputs of both.

```ts
export declare const merge: <RIn2, E2, ROut2>(that: Layer<RIn2, E2, ROut2>) => <RIn, E, ROut>(self: Layer<RIn, E, ROut>) => Layer<RIn2 | RIn, E2 | E, ROut2 | ROut>;
```

### orDie

Translates effect failure into death of the fiber, making all failures
unchecked and not a part of the type of the layer.

```ts
export declare const orDie: <R, E, A>(self: Layer<R, E, A>) => Layer<R, never, A>;
```

### orElse

Executes this layer and returns its output, if it succeeds, but otherwise
executes the specified layer.

```ts
export declare const orElse: <R1, E1, A1>(that: LazyArg<Layer<R1, E1, A1>>) => <R, E, A>(self: Layer<R, E, A>) => Layer<R1 | R, E1 | E, A & A1>;
```

### passthrough

Returns a new layer that produces the outputs of this layer but also
passes through the inputs.

```ts
export declare const passthrough: <RIn extends Spreadable, E, ROut extends Spreadable>(self: Layer<RIn, E, ROut>) => Layer<RIn, E, RIn | ROut>;
```

### project

Projects out part of one of the services output by this layer using the
specified function.

```ts
export declare const project: <A, B>(tagA: Tag<A>, tagB: Tag<B>, f: (a: A) => B) => <RIn, E, ROut>(self: Layer<RIn, E, A | ROut>) => Layer<RIn, E, B>;
```

### provideTo

Feeds the output services of this builder into the input of the specified
builder, resulting in a new builder with the inputs of this builder as
well as any leftover inputs, and the outputs of the specified builder.

```ts
export declare const provideTo: <RIn2, E2, ROut2>(that: Layer<RIn2, E2, ROut2>) => <RIn, E, ROut>(self: Layer<RIn, E, ROut>) => Layer<RIn | Exclude<RIn2, ROut>, E2 | E, ROut2>;
```

### provideToAndMerge

Feeds the output services of this layer into the input of the specified
layer, resulting in a new layer with the inputs of this layer, and the
outputs of both layers.

```ts
export declare const provideToAndMerge: <RIn2, E2, ROut2>(that: Layer<RIn2, E2, ROut2>) => <RIn, E, ROut>(self: Layer<RIn, E, ROut>) => Layer<RIn | Exclude<RIn2, ROut>, E2 | E, ROut2 | ROut>;
```

### retry

Retries constructing this layer according to the specified schedule.

```ts
export declare const retry: <S, RIn1, E, X>(schedule: Schedule<S, RIn1, E, X>) => <RIn, ROut>(self: Layer<RIn, E, ROut>) => Layer<RIn1 | RIn, E, ROut>;
```

### scope

A layer that constructs a scope and closes it when the workflow the layer
is provided to completes execution, whether by success, failure, or
interruption. This can be used to close a scope when providing a layer to a
workflow.

```ts
export declare const scope: Layer<never, never, CloseableScope>;
```

### scoped

Constructs a layer from the specified scoped effect.

```ts
export declare const scoped: <T, R, E, T1 extends T>(tag: Tag<T>, effect: Effect<R, E, T1>) => Layer<Exclude<R, Scope>, E, T>;
```

### scopedDiscard

Constructs a layer from the specified scoped effect.

```ts
export declare const scopedDiscard: <T, R, E>(effect: Effect<R, E, T>) => Layer<Exclude<R, Scope>, E, never>;
```

### scopedEnvironment

Constructs a layer from the specified scoped effect, which must return one
or more services.

```ts
export declare const scopedEnvironment: <R, E, A>(effect: Effect<R, E, Env<A>>) => Layer<Exclude<R, Scope>, E, A>;
```

### service

Constructs a layer that accesses and returns the specified service from the
environment.

```ts
export declare const service: <T>(tag: Tag<T>) => Layer<T, never, T>;
```

### succeed

Constructs a layer from the specified value.

```ts
export declare const succeed: <T>(tag: Tag<T>) => (resource: T) => Layer<never, never, T>;
```

### succeedEnvironment

Constructs a layer from the specified value, which must return one or more
services.

```ts
export declare const succeedEnvironment: <A>(a: Env<A>) => Layer<never, never, A>;
```

### suspend

Lazily constructs a layer. This is useful to avoid infinite recursion when
creating layers that refer to themselves.

```ts
export declare const suspend: <RIn, E, ROut>(f: LazyArg<Layer<RIn, E, ROut>>) => Layer<RIn, E, ROut>;
```

### sync

Lazily constructs a layer from the specified value.

```ts
export declare const sync: <T>(tag: Tag<T>) => (resource: LazyArg<T>) => Layer<never, never, T>;
```

### syncEnvironment

Lazily constructs a layer from the specified value, which must return one or more
services.

```ts
export declare const syncEnvironment: <A>(a: LazyArg<Env<A>>) => Layer<never, never, A>;
```

### tap

Performs the specified effect if this layer succeeds.

```ts
export declare const tap: <ROut, RIn2, E2, X>(f: (_: Env<ROut>) => Effect<RIn2, E2, X>) => <RIn, E>(self: Layer<RIn, E, ROut>) => Layer<RIn2 | RIn, E2 | E, ROut>;
```

### tapError

Performs the specified effect if this layer fails.

```ts
export declare const tapError: <E, RIn2, E2, X>(f: (e: E) => Effect<RIn2, E2, X>) => <RIn, ROut>(self: Layer<RIn, E, ROut>) => Layer<RIn2 | RIn, E | E2, ROut>;
```

### toRuntime

Converts a layer that requires no services into a scoped runtime, which can
be used to execute effects.

```ts
export declare const toRuntime: <RIn, E, ROut>(self: Layer<RIn, E, ROut>) => Effect<Scope | RIn, E, Runtime<ROut>>;
```

### unifyLayer

```ts
export declare const unifyLayer: <X extends Layer<any, any, any>>(self: X) => Layer<[X] extends [{ [_RIn]: () => infer RIn; }] ? RIn : never, [X] extends [{ [_E]: () => infer E; }] ? E : never, [X] extends [{ [_ROut]: (_: infer ROut) => void; }] ? ROut : never>;
```

### withScope

```ts
export declare const withScope: (scope: Scope) => <RIn, E, ROut>(self: Layer<RIn, E, ROut>) => Effect<never, never, (_: MemoMap) => Effect<RIn, E, Env<ROut>>>;
```

### zipWithPar

Combines this layer the specified layer, producing a new layer that has the
inputs of both, and the outputs of both combined using the specified
function.

```ts
export declare const zipWithPar: <R1, E1, A1, A, A2>(that: Layer<R1, E1, A1>, f: (a: Env<A>, b: Env<A1>) => Env<A2>) => <R, E>(self: Layer<R, E, A>) => Layer<R1 | R, E1 | E, A2>;
```

