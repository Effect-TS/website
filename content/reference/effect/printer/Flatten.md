## Flatten

Reference Documentation for the module '@effect/printer/Flatten'

Because certain documents do not change after removal of newlines, etc, there
is no point in creating a `Union` of the flattened and unflattened versions.
All this leads to is the introduction of two possible branches for a layout
algorithm to take, resulting in potentially exponential behavior on deeply
nested examples.

```ts
export type Flatten<A> = Flattened<A> | AlreadyFlat | NeverFlat;
```

## General API

### alreadyFlat

```ts
export declare const alreadyFlat: Flatten<never>;
```

### flattened

```ts
export declare const flattened: <A>(value: A) => Flattened<A>;
```

### fold

```ts
export declare const fold: <A, R>(patterns: { readonly Flattened: (value: A) => R; readonly AlreadyFlat: () => R; readonly NeverFlat: () => R; }) => (flatten: Flatten<A>) => R;
```

### isAlreadyFlat

```ts
export declare const isAlreadyFlat: <A>(a: Flatten<A>) => a is AlreadyFlat;
```

### isFlattened

```ts
export declare const isFlattened: <A>(a: Flatten<A>) => a is Flattened<A>;
```

### isNeverFlat

```ts
export declare const isNeverFlat: <A>(a: Flatten<A>) => a is NeverFlat;
```

### map

```ts
export declare const map: <A, B>(f: (a: A) => B) => (self: Flatten<A>) => Flatten<B>;
```

### neverFlat

```ts
export declare const neverFlat: Flatten<never>;
```

