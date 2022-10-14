## LogSpan

Reference Documentation for the module '@effect/io/LogSpan'

```ts
export interface LogSpan {
    readonly label: string;
    readonly startTime: number;
}
```

## Methods

### apply

```ts
export declare const apply: (label: string, startTime: number) => LogSpan;
```

### render

```ts
export declare const render: (now: number) => (self: LogSpan) => string;
```

