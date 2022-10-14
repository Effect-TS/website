## LogSpan

Reference Documentation for the module '@effect/core/io/LogSpan'

```ts
export interface LogSpan {
    readonly label: string;
    readonly startTime: number;
}
```

## Methods

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

