## Render

Reference Documentation for the module '@effect/printer/Render'

## General API

### render

```ts
export declare const render: <A>(self: DocStream<A>) => string;
```

### renderCompact

```ts
export declare const renderCompact: <A>(self: Doc<A>) => string;
```

### renderPretty

```ts
export declare const renderPretty: (lineWidth: number, ribbonFraction?: number) => <A>(self: Doc<A>) => string;
```

### renderPrettyDefault

```ts
export declare const renderPrettyDefault: <A>(self: Doc<A>) => string;
```

### renderPrettyUnbounded

```ts
export declare const renderPrettyUnbounded: <A>(self: Doc<A>) => string;
```

### renderSmart

```ts
export declare const renderSmart: <A>(lineWidth: number, ribbonFraction?: number) => (self: Doc<A>) => string;
```

### renderSmartDefault

```ts
export declare const renderSmartDefault: <A>(self: Doc<A>) => string;
```

### renderSmartUnbounded

```ts
export declare const renderSmartUnbounded: <A>(self: Doc<A>) => string;
```

