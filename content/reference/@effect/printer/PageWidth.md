## PageWidth

Reference Documentation for the module '@effect/printer/PageWidth'

Represents the maximum number of characters that fit onto a single line in a
document. The layout algorithms will try to avoid exceeding the set character
limit by inserting line breaks where appropriate (e.g., via `softLine`).

```ts
export type PageWidth = AvailablePerLine | Unbounded;
```

## General API

### availablePerLine

```ts
export declare const availablePerLine: (lineWidth: number, ribbonFraction: number) => PageWidth;
```

### defaultPageWidth

```ts
export declare const defaultPageWidth: AvailablePerLine;
```

### isAvailablePerLine

```ts
export declare const isAvailablePerLine: (u: unknown) => u is AvailablePerLine;
```

### isPageWidth

```ts
export declare const isPageWidth: (u: unknown) => u is PageWidth;
```

### isUnbounded

```ts
export declare const isUnbounded: (u: unknown) => u is Unbounded;
```

### remainingWidth

Calculates the remaining width on the current line.

```ts
export declare const remainingWidth: (lineLength: number, ribbonFraction: number, lineIndent: number, currentColumn: number) => number;
```

### unbounded

```ts
export declare const unbounded: PageWidth;
```

