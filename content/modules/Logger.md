## Logger

Reference Documentation for the module '@effect/core/io/Logger'

```ts
export interface Logger<Message, Output> {
    readonly apply: (fiberId: FiberId, logLevel: LogLevel, message: Message, cause: Cause<unknown>, context: FiberRefs, spans: List<LogSpan>, annotations: ImmutableMap<string, string>) => Output;
}
```

## Methods

### consoleLogger

```ts
export declare const consoleLogger: Logger<string, void>;
```

### consoleLoggerLayer

```ts
export declare const consoleLoggerLayer: Layer<never, never, never>;
```

### contramap

```ts
export declare const contramap: <Message, Message1>(f: (message: Message1) => Message) => <Output>(self: Logger<Message, Output>) => Logger<Message1, Output>;
```

### defaultLogger

```ts
export declare const defaultLogger: Logger<string, string>;
```

### filterLogLevel

Returns a version of this logger that only logs messages when the log level
satisfies the specified predicate.

```ts
export declare const filterLogLevel: (f: (logLevel: LogLevel) => boolean) => <Message, Output>(self: Logger<Message, Output>) => Logger<Message, Maybe<Output>>;
```

### map

```ts
export declare const map: <Output, B>(f: (output: Output) => B) => <Message>(self: Logger<Message, Output>) => Logger<Message, B>;
```

### none

A logger that does nothing in response to logging events.

```ts
export declare const none: Logger<unknown, void>;
```

### simple

```ts
export declare const simple: <A, B>(log: (a: A) => B) => Logger<A, B>;
```

### succeed

```ts
export declare const succeed: <A>(a: A) => Logger<unknown, A>;
```

### sync

```ts
export declare const sync: <A>(a: LazyArg<A>) => Logger<unknown, A>;
```

### test

```ts
export declare const test: <Message>(input: Message) => <Output>(self: Logger<Message, Output>) => Output;
```

### withConsoleLogger

```ts
export declare const withConsoleLogger: <R, E, B>(effect: Effect<R, E, B>) => Effect<R, E, B>;
```

### zip

Combines this logger with the specified logger to produce a new logger that
logs to both this logger and that logger.

```ts
export declare const zip: <Message1, Output1>(that: Logger<Message1, Output1>) => <Message, Output>(self: Logger<Message, Output>) => Logger<Message & Message1, readonly [Output, Output1]>;
```

### zipLeft

```ts
export declare const zipLeft: <Message1, Output1>(that: Logger<Message1, Output1>) => <Message, Output>(self: Logger<Message, Output>) => Logger<Message & Message1, Output>;
```

### zipRight

```ts
export declare const zipRight: <Message1, Output1>(that: Logger<Message1, Output1>) => <Message, Output>(self: Logger<Message, Output>) => Logger<Message & Message1, Output1>;
```

