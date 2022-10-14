## Random

Reference Documentation for the module '@effect/core/io/Random'

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

## Methods

### defaultRandom

```ts
/**
 * @tsplus static effect/core/io/Random.Ops default
 */
export declare const defaultRandom: LiveRandom;
```

### live

```ts
/**
 * @tsplus static effect/core/io/Random.Ops live
 */
export declare const live: Layer<never, never, Random>;
```

### next

```ts
/**
 * @tsplus static effect/core/io/Random.Ops next
 */
export declare const next: Effect<never, never, number>;
```

### nextBoolean

```ts
/**
 * @tsplus static effect/core/io/Random.Ops nextBoolean
 */
export declare const nextBoolean: Effect<never, never, boolean>;
```

### nextInt

```ts
/**
 * @tsplus static effect/core/io/Random.Ops nextInt
 */
export declare const nextInt: Effect<never, never, number>;
```

### nextIntBetween

```ts
/**
 * @tsplus static effect/core/io/Random.Ops nextIntBetween
 */
export declare const nextIntBetween: (low: number, high: number) => Effect<never, never, number>;
```

### nextRange

```ts
/**
 * @tsplus static effect/core/io/Random.Ops nextRange
 */
export declare const nextRange: (low: number, high: number) => Effect<never, never, number>;
```

### shuffle

```ts
/**
 * @tsplus static effect/core/io/Random.Ops shuffle
 */
export declare const shuffle: <A>(collection: Collection<A>) => Effect<never, never, Collection<A>>;
```

### withSeed

```ts
/**
 * @tsplus static effect/core/io/Random.Ops withSeed
 */
export declare const withSeed: (seed: number) => <R, E, A>(effect: Effect<R, E, A>) => Effect<R, E, A>;
```

