## LogSpan

Reference Documentation for the module '@effect/core/io/LogSpan'

### apply

```ts
/**
 * @tsplus static effect/core/io/LogSpan.Ops __call
 */
export declare const apply: (label: string, startTime: number) => LogSpan;
```

### render

```ts
/**
 * @tsplus static effect/core/io/LogSpan.Aspects render
 * @tsplus pipeable effect/core/io/LogSpan render
 */
export declare const render: (now: number) => (self: LogSpan) => string;
```

