## Logger

Reference Documentation for the module '@effect/core/io/Logger'

### consoleLogger

```ts
/**
 * @tsplus static effect/core/io/Logger.Ops console
 */
export declare const consoleLogger: Logger<string, void>;
```

### consoleLoggerLayer

```ts
/**
 * @tsplus static effect/core/io/Logger.Ops consoleLoggerLayer
 */
export declare const consoleLoggerLayer: Layer<never, never, never>;
```

### contramap

```ts
/**
 * @tsplus static effect/core/io/Logger.Aspects contramap
 * @tsplus pipeable effect/core/io/Logger contramap
 */
export declare const contramap: <Message, Message1>(f: (message: Message1) => Message) => <Output>(self: Logger<Message, Output>) => Logger<Message1, Output>;
```

### defaultLogger

```ts
/**
 * @tsplus static effect/core/io/Logger.Ops default
 */
export declare const defaultLogger: Logger<string, string>;
```

### filterLogLevel

Returns a version of this logger that only logs messages when the log level
satisfies the specified predicate.

```ts
/**
 * @tsplus static effect/core/io/Logger.Aspects filterLogLevel
 * @tsplus pipeable effect/core/io/Logger filterLogLevel
 */
export declare const filterLogLevel: (f: (logLevel: LogLevel) => boolean) => <Message, Output>(self: Logger<Message, Output>) => Logger<Message, Maybe<Output>>;
```

### map

```ts
/**
 * @tsplus static effect/core/io/Logger.Aspects map
 * @tsplus pipeable effect/core/io/Logger map
 */
export declare const map: <Output, B>(f: (output: Output) => B) => <Message>(self: Logger<Message, Output>) => Logger<Message, B>;
```

### none

A logger that does nothing in response to logging events.

```ts
/**
 * @tsplus static effect/core/io/Logger.Ops none
 */
export declare const none: Logger<unknown, void>;
```

### simple

```ts
/**
 * @tsplus static effect/core/io/Logger.Ops simple
 */
export declare const simple: <A, B>(log: (a: A) => B) => Logger<A, B>;
```

### succeed

```ts
/**
 * @tsplus static effect/core/io/Logger.Ops succeed
 */
export declare const succeed: <A>(a: A) => Logger<unknown, A>;
```

### sync

```ts
/**
 * @tsplus static effect/core/io/Logger.Ops sync
 */
export declare const sync: <A>(a: LazyArg<A>) => Logger<unknown, A>;
```

### test

```ts
/**
 * @tsplus static effect/core/io/Logger.Aspects test
 * @tsplus pipeable effect/core/io/Logger test
 */
export declare const test: <Message>(input: Message) => <Output>(self: Logger<Message, Output>) => Output;
```

### withConsoleLogger

```ts
/**
 * @tsplus static effect/core/io/Logger.Ops withConsoleLogger
 */
export declare const withConsoleLogger: <R, E, B>(effect: Effect<R, E, B>) => Effect<R, E, B>;
```

### zip

Combines this logger with the specified logger to produce a new logger that
logs to both this logger and that logger.

```ts
/**
 * @tsplus pipeable-operator effect/core/io/Logger +
 * @tsplus static effect/core/io/Logger.Aspects zip
 * @tsplus pipeable effect/core/io/Logger zip
 */
export declare const zip: <Message1, Output1>(that: Logger<Message1, Output1>) => <Message, Output>(self: Logger<Message, Output>) => Logger<Message & Message1, readonly [Output, Output1]>;
```

### zipLeft

```ts
/**
 * @tsplus pipeable-operator effect/core/io/Logger <
 * @tsplus static effect/core/io/Logger zipLeft
 * @tsplus pipeable effect/core/io/Logger zipLeft
 */
export declare const zipLeft: <Message1, Output1>(that: Logger<Message1, Output1>) => <Message, Output>(self: Logger<Message, Output>) => Logger<Message & Message1, Output>;
```

### zipRight

```ts
/**
 * @tsplus pipeable-operator effect/core/io/Logger >
 * @tsplus static effect/core/io/Logger.Aspects zipRight
 * @tsplus pipeable effect/core/io/Logger zipRight
 */
export declare const zipRight: <Message1, Output1>(that: Logger<Message1, Output1>) => <Message, Output>(self: Logger<Message, Output>) => Logger<Message & Message1, Output1>;
```

