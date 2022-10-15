## Random

Reference Documentation for the module '@effect/io/Random'

```ts
export interface Random {
    readonly [RandomSym]: RandomSym;
    readonly next: Effect<never, never, number>;
    readonly nextBoolean: Effect<never, never, boolean>;
    readonly nextInt: Effect<never, never, number>;
    readonly nextRange: (low: number, high: number) => Effect<never, never, number>;
    readonly nextIntBetween: (low: number, high: number) => Effect<never, never, number>;
    readonly shuffle: <A>(collection: Collection<A>) => Effect<never, never, Collection<A>>;
}
```

## General API

### defaultRandom

```ts
export declare const defaultRandom: LiveRandom;
```

### live

```ts
export declare const live: Layer<never, never, Random>;
```

### next

```ts
export declare const next: Effect<never, never, number>;
```

### nextBoolean

```ts
export declare const nextBoolean: Effect<never, never, boolean>;
```

### nextInt

```ts
export declare const nextInt: Effect<never, never, number>;
```

### nextIntBetween

```ts
export declare const nextIntBetween: (low: number, high: number) => Effect<never, never, number>;
```

### nextRange

```ts
export declare const nextRange: (low: number, high: number) => Effect<never, never, number>;
```

### shuffle

```ts
export declare const shuffle: <A>(collection: Collection<A>) => Effect<never, never, Collection<A>>;
```

### withSeed

```ts
export declare const withSeed: (seed: number) => <R, E, A>(effect: Effect<R, E, A>) => Effect<R, E, A>;
```

