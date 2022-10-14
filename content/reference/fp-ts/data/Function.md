## Function

Reference Documentation for the module '@fp-ts/data/Function'

## Methods

### absurd

```ts
/**
 * @since 3.0.0
 */
export declare const absurd: <A>(_: never) => A;
```

### apply

```ts
/**
 * @since 3.0.0
 */
export declare const apply: <A>(a: A) => <B>(f: (a: A) => B) => B;
```

### compose

```ts
/**
 * @since 3.0.0
 */
export declare const compose: <B, C>(bc: (b: B) => C) => <A>(ab: (a: A) => B) => (a: A) => C;
```

### constFalse

A thunk that returns always `false`.

```ts
/**
 * @since 3.0.0
 */
export declare const constFalse: LazyArg<boolean>;
```

### constNull

A thunk that returns always `null`.

```ts
/**
 * @since 3.0.0
 */
export declare const constNull: LazyArg<null>;
```

### constTrue

A thunk that returns always `true`.

```ts
/**
 * @since 3.0.0
 */
export declare const constTrue: LazyArg<boolean>;
```

### constUndefined

A thunk that returns always `undefined`.

```ts
/**
 * @since 3.0.0
 */
export declare const constUndefined: LazyArg<undefined>;
```

### constVoid

A thunk that returns always `void`.

```ts
/**
 * @since 3.0.0
 */
export declare const constVoid: LazyArg<void>;
```

### constant

```ts
/**
 * @since 3.0.0
 */
export declare const constant: <A>(a: A) => LazyArg<A>;
```

### decrement

```ts
/**
 * @since 3.0.0
 */
export declare const decrement: (n: number) => number;
```

### flip

Flips the arguments of a curried function.

```ts
/**
 * @since 3.0.0
 */
export declare const flip: <A, B, C>(f: (a: A) => (b: B) => C) => (b: B) => (a: A) => C;
```

### flow

Performs left-to-right function composition. The first argument may have any arity, the remaining arguments must be unary.

```ts
/**
 * @since 3.0.0
 */
export declare const flow: { <A extends readonly unknown[], B>(ab: (...a: A) => B): (...a: A) => B; <A extends readonly unknown[], B, C>(ab: (...a: A) => B, bc: (b: B) => C): (...a: A) => C; <A extends readonly unknown[], B, C, D>(ab: (...a: A) => B, bc: (b: B) => C, cd: (c: C) => D): (...a: A) => D; <A extends readonly unknown[], B, C, D, E>(ab: (...a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E): (...a: A) => E; <A extends readonly unknown[], B, C, D, E, F>(ab: (...a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F): (...a: A) => F; <A extends readonly unknown[], B, C, D, E, F, G>(ab: (...a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F, fg: (f: F) => G): (...a: A) => G; <A extends readonly unknown[], B, C, D, E, F, G, H>(ab: (...a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F, fg: (f: F) => G, gh: (g: G) => H): (...a: A) => H; <A extends readonly unknown[], B, C, D, E, F, G, H, I>(ab: (...a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F, fg: (f: F) => G, gh: (g: G) => H, hi: (h: H) => I): (...a: A) => I; <A extends readonly unknown[], B, C, D, E, F, G, H, I, J>(ab: (...a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F, fg: (f: F) => G, gh: (g: G) => H, hi: (h: H) => I, ij: (i: I) => J): (...a: A) => J; };
```

### getMonoid

Unary functions form a monoid as long as you can provide a monoid for the codomain.

```ts
/**
 * @category instances
 * @since 3.0.0
 */
export declare const getMonoid: <M>(M: Monoid<M>) => <A>() => Monoid<(a: A) => M>;
```

### getSemigroup

Unary functions form a semigroup as long as you can provide a semigroup for the codomain.

```ts
/**
 * @category instances
 * @since 3.0.0
 */
export declare const getSemigroup: <S>(S: Semigroup<S>) => <A>() => Semigroup<(a: A) => S>;
```

### hole

Type hole simulation

```ts
/**
 * @since 3.0.0
 */
export declare const hole: <T>() => T;
```

### id

```ts
/**
 * @category constructors
 * @since 3.0.0
 */
export declare const id: <A>() => Endomorphism<A>;
```

### identity

```ts
/**
 * @since 3.0.0
 */
export declare const identity: <A>(a: A) => A;
```

### increment

```ts
/**
 * @since 3.0.0
 */
export declare const increment: (n: number) => number;
```

### pipe

Pipes the value of an expression into a pipeline of functions.

```ts
/**
 * @since 3.0.0
 */
export declare const pipe: { <A>(a: A): A; <A, B>(a: A, ab: (a: A) => B): B; <A, B, C>(a: A, ab: (a: A) => B, bc: (b: B) => C): C; <A, B, C, D>(a: A, ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D): D; <A, B, C, D, E>(a: A, ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E): E; <A, B, C, D, E, F>(a: A, ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F): F; <A, B, C, D, E, F, G>(a: A, ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F, fg: (f: F) => G): G; <A, B, C, D, E, F, G, H>(a: A, ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F, fg: (f: F) => G, gh: (g: G) => H): H; <A, B, C, D, E, F, G, H, I>(a: A, ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F, fg: (f: F) => G, gh: (g: G) => H, hi: (h: H) => I): I; <A, B, C, D, E, F, G, H, I, J>(a: A, ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F, fg: (f: F) => G, gh: (g: G) => H, hi: (h: H) => I, ij: (i: I) => J): J; <A, B, C, D, E, F, G, H, I, J, K>(a: A, ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F, fg: (f: F) => G, gh: (g: G) => H, hi: (h: H) => I, ij: (i: I) => J, jk: (j: J) => K): K; <A, B, C, D, E, F, G, H, I, J, K, L>(a: A, ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F, fg: (f: F) => G, gh: (g: G) => H, hi: (h: H) => I, ij: (i: I) => J, jk: (j: J) => K, kl: (k: K) => L): L; <A, B, C, D, E, F, G, H, I, J, K, L, M>(a: A, ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F, fg: (f: F) => G, gh: (g: G) => H, hi: (h: H) => I, ij: (i: I) => J, jk: (j: J) => K, kl: (k: K) => L, lm: (l: L) => M): M; <A, B, C, D, E, F, G, H, I, J, K, L, M, N>(a: A, ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F, fg: (f: F) => G, gh: (g: G) => H, hi: (h: H) => I, ij: (i: I) => J, jk: (j: J) => K, kl: (k: K) => L, lm: (l: L) => M, mn: (m: M) => N): N; <A, B, C, D, E, F, G, H, I, J, K, L, M, N, O>(a: A, ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F, fg: (f: F) => G, gh: (g: G) => H, hi: (h: H) => I, ij: (i: I) => J, jk: (j: J) => K, kl: (k: K) => L, lm: (l: L) => M, mn: (m: M) => N, no: (n: N) => O): O; <A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P>(a: A, ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F, fg: (f: F) => G, gh: (g: G) => H, hi: (h: H) => I, ij: (i: I) => J, jk: (j: J) => K, kl: (k: K) => L, lm: (l: L) => M, mn: (m: M) => N, no: (n: N) => O, op: (o: O) => P): P; <A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q>(a: A, ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F, fg: (f: F) => G, gh: (g: G) => H, hi: (h: H) => I, ij: (i: I) => J, jk: (j: J) => K, kl: (k: K) => L, lm: (l: L) => M, mn: (m: M) => N, no: (n: N) => O, op: (o: O) => P, pq: (p: P) => Q): Q; <A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R>(a: A, ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F, fg: (f: F) => G, gh: (g: G) => H, hi: (h: H) => I, ij: (i: I) => J, jk: (j: J) => K, kl: (k: K) => L, lm: (l: L) => M, mn: (m: M) => N, no: (n: N) => O, op: (o: O) => P, pq: (p: P) => Q, qr: (q: Q) => R): R; <A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S>(a: A, ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F, fg: (f: F) => G, gh: (g: G) => H, hi: (h: H) => I, ij: (i: I) => J, jk: (j: J) => K, kl: (k: K) => L, lm: (l: L) => M, mn: (m: M) => N, no: (n: N) => O, op: (o: O) => P, pq: (p: P) => Q, qr: (q: Q) => R, rs: (r: R) => S): S; <A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T>(a: A, ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F, fg: (f: F) => G, gh: (g: G) => H, hi: (h: H) => I, ij: (i: I) => J, jk: (j: J) => K, kl: (k: K) => L, lm: (l: L) => M, mn: (m: M) => N, no: (n: N) => O, op: (o: O) => P, pq: (p: P) => Q, qr: (q: Q) => R, rs: (r: R) => S, st: (s: S) => T): T; };
```

### tupled

Creates a tupled version of this function: instead of `n` arguments, it accepts a single tuple argument.

```ts
/**
 * @since 3.0.0
 */
export declare const tupled: <A extends readonly unknown[], B>(f: (...a: A) => B) => (a: A) => B;
```

### unsafeCoerce

```ts
/**
 * @since 3.0.0
 */
export declare const unsafeCoerce: <A, B>(a: A) => B;
```

### untupled

Inverse function of `tupled`

```ts
/**
 * @since 3.0.0
 */
export declare const untupled: <A extends readonly unknown[], B>(f: (a: A) => B) => (...a: A) => B;
```

