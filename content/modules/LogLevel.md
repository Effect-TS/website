## LogLevel

Reference Documentation for the module '@effect/core/io/LogLevel'

A `LogLevel` represents the log level associated with an individual logging
operation. Log levels are used both to describe the granularity (or
importance) of individual log statements, as well as to enable tuning
verbosity of log output.

```ts
export type LogLevel = All | Fatal | Error | Warning | Info | Debug | Trace | None;
```

## Methods

### greaterThan

```ts
export declare const greaterThan: (that: LogLevel) => (self: LogLevel) => boolean;
```

### greaterThanEqual

```ts
export declare const greaterThanEqual: (that: LogLevel) => (self: LogLevel) => boolean;
```

### lessThan

```ts
export declare const lessThan: (that: LogLevel) => (self: LogLevel) => boolean;
```

### lessThanEqual

```ts
export declare const lessThanEqual: (that: LogLevel) => (self: LogLevel) => boolean;
```

### locally

```ts
export declare const locally: (self: LogLevel) => <R, E, A>(effect: Effect<R, E, A>) => Effect<R, E, A>;
```

### ordLogLevel

```ts
export declare const ordLogLevel: Ord<LogLevel>;
```

