## TRandom

Reference Documentation for the module '@effect/stm/TRandom'

```ts
export interface TRandom {
    readonly [TRandomSym]: TRandomSym;
    readonly next: STM<never, never, number>;
    readonly nextBoolean: STM<never, never, boolean>;
    readonly nextInt: STM<never, never, number>;
    readonly nextRange: (low: number, high: number) => STM<never, never, number>;
    readonly nextIntBetween: (low: number, high: number) => STM<never, never, number>;
    readonly shuffle: <A>(collection: Collection<A>) => STM<never, never, Collection<A>>;
    readonly withState: <A>(f: (state: PCGRandomState) => readonly [A, PCGRandomState]) => STM<never, never, A>;
}
```

## General API

### defaultTRandom

```ts
export declare const defaultTRandom: Effect<never, never, LiveTRandom>;
```

### live

```ts
export declare const live: Layer<never, never, TRandom>;
```

### next

```ts
export declare const next: STM<TRandom, never, number>;
```

### nextBoolean

Generates a pseudo-random boolean inside a transaction.

```ts
export declare const nextBoolean: STM<TRandom, never, boolean>;
```

### nextInt

Generates a pseudo-random integer inside a transaction.

```ts
export declare const nextInt: STM<TRandom, never, number>;
```

### nextIntBetween

Generates a pseudo-random integer in the specified range inside a
transaction.

```ts
export declare const nextIntBetween: (low: number, high: number) => STM<TRandom, never, number>;
```

### nextRange

```ts
export declare const nextRange: (low: number, high: number) => STM<TRandom, never, number>;
```

### shuffle

```ts
export declare const shuffle: <A>(collection: Collection<A>) => STM<TRandom, never, Collection<A>>;
```

### withSeed

```ts
export declare const withSeed: (seed: number) => <R, E, A>(stm: STM<R, E, A>) => STM<Exclude<R, TRandom>, E, A>;
```

