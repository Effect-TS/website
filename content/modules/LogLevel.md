## LogLevel

Reference Documentation for the module '@effect/core/io/LogLevel'

### greaterThan

```ts
/**
 * @tsplus pipeable-operator effect/core/io/LogLevel >
 * @tsplus static effect/core/io/LogLevel.Aspects greaterThan
 * @tsplus pipeable effect/core/io/LogLevel greaterThan
 */
export declare const greaterThan: (that: LogLevel) => (self: LogLevel) => boolean;
```

### greaterThanEqual

```ts
/**
 * @tsplus pipeable-operator effect/core/io/LogLevel >=
 * @tsplus static effect/core/io/LogLevel.Aspects greaterThanEqual
 * @tsplus pipeable effect/core/io/LogLevel greaterThanEqual
 */
export declare const greaterThanEqual: (that: LogLevel) => (self: LogLevel) => boolean;
```

### lessThan

```ts
/**
 * @tsplus pipeable-operator effect/core/io/LogLevel <
 * @tsplus static effect/core/io/LogLevel.Aspects lessThen
 * @tsplus pipeable effect/core/io/LogLevel lessThan
 */
export declare const lessThan: (that: LogLevel) => (self: LogLevel) => boolean;
```

### lessThanEqual

```ts
/**
 * @tsplus pipeable-operator effect/core/io/LogLevel <=
 * @tsplus static effect/core/io/LogLevel.Aspects lessThanEqual
 * @tsplus pipeable effect/core/io/LogLevel lessThanEqual
 */
export declare const lessThanEqual: (that: LogLevel) => (self: LogLevel) => boolean;
```

### locally

```ts
/**
 * @tsplus static effect/core/io/LogLevel.Ops __call
 * @tsplus static effect/core/io/LogLevel.Ops locally
 */
export declare const locally: (self: LogLevel) => <R, E, A>(effect: Effect<R, E, A>) => Effect<R, E, A>;
```

### ordLogLevel

```ts
/**
 * @tsplus static effect/core/io/LogLevel.Ops ord
 */
export declare const ordLogLevel: Ord<LogLevel>;
```

