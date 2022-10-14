## FiberRef

Reference Documentation for the module '@effect/core/io/FiberRef'

A `FiberRef` is Effect-TS's equivalent of Java's `ThreadLocal`. The value of a
`FiberRef` is automatically propagated to child fibers when they are forked
and merged back in to the value of the parent fiber after they are joined.

By default the value of the child fiber will replace the value of the parent
fiber on join but you can specify your own logic for how values should be
merged.

```ts
export interface FiberRef<Value> extends FiberRef.WithPatch<Value, any> {
}
```

## Methods

### currentEnvironment

```ts
export declare const currentEnvironment: FiberRef<Env<never>>;
```

### currentLogAnnotations

```ts
export declare const currentLogAnnotations: FiberRef<ImmutableMap<string, string>>;
```

### currentLogLevel

```ts
export declare const currentLogLevel: FiberRef<LogLevel>;
```

### currentLogSpan

```ts
export declare const currentLogSpan: FiberRef<List<LogSpan>>;
```

### currentLoggers

```ts
export declare const currentLoggers: WithPatch<HashSet<Logger<string, any>>, Patch<Logger<string, any>>>;
```

### currentParallelism

```ts
export declare const currentParallelism: FiberRef<Maybe<number>>;
```

### currentScheduler

```ts
export declare const currentScheduler: FiberRef<Scheduler>;
```

### forkScopeOverride

```ts
export declare const forkScopeOverride: FiberRef<Maybe<FiberScope>>;
```

### interruptedCause

```ts
export declare const interruptedCause: FiberRef<Cause<never>>;
```

### make

```ts
export declare const make: <A>(initial: A, fork?: (a: A) => A, join?: (left: A, right: A) => A) => Effect<Scope, never, FiberRef<A>>;
```

### makeEnvironment

```ts
export declare const makeEnvironment: <A>(initial: Env<A>) => Effect<Scope, never, WithPatch<Env<A>, Patch<A, A>>>;
```

### makePatch

```ts
export declare const makePatch: <Value0, Patch0>(initial: Value0, differ: Differ<Value0, Patch0>, fork0: Patch0, join0?: (oldV: Value0, newV: Value0) => Value0) => Effect<Scope, never, WithPatch<Value0, Patch0>>;
```

### makeWith

```ts
export declare const makeWith: <Value, Patch>(ref: WithPatch<Value, Patch>) => Effect<Scope, never, WithPatch<Value, Patch>>;
```

### unsafeMake

```ts
export declare const unsafeMake: <A>(initial: A, fork?: (a: A) => A, join?: (left: A, right: A) => A) => FiberRef<A>;
```

### unsafeMakeEnvironment

```ts
export declare const unsafeMakeEnvironment: <A>(initial: Env<A>) => WithPatch<Env<A>, Patch<A, A>>;
```

### unsafeMakePatch

```ts
export declare const unsafeMakePatch: <Value0, Patch0>(initial: Value0, differ: Differ<Value0, Patch0>, fork0: Patch0, join0?: (oldV: Value0, newV: Value0) => Value0) => WithPatch<Value0, Patch0>;
```

