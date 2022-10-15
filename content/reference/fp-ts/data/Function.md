## Function

Reference Documentation for the module '@fp-ts/data/Function'

## Constructors

### id

```ts
export declare const id: <A>() => Endomorphism<A>;
```

Added in: 3.0.0

## Instances

### getMonoid

Unary functions form a monoid as long as you can provide a monoid for the codomain.

```ts
export declare const getMonoid: <M>(M: Monoid<M>) => <A>() => Monoid<(a: A) => M>;
```

Added in: 3.0.0

### getSemigroup

Unary functions form a semigroup as long as you can provide a semigroup for the codomain.

```ts
export declare const getSemigroup: <S>(S: Semigroup<S>) => <A>() => Semigroup<(a: A) => S>;
```

Added in: 3.0.0

## General API

### absurd

```ts
export declare const absurd: <A>(_: never) => A;
```

Added in: 3.0.0

### apply

```ts
export declare const apply: <A>(a: A) => <B>(f: (a: A) => B) => B;
```

Added in: 3.0.0

### compose

```ts
export declare const compose: <B, C>(bc: (b: B) => C) => <A>(ab: (a: A) => B) => (a: A) => C;
```

Added in: 3.0.0

### constFalse

A thunk that returns always `false`.

```ts
export declare const constFalse: LazyArg<boolean>;
```

Added in: 3.0.0

### constNull

A thunk that returns always `null`.

```ts
export declare const constNull: LazyArg<null>;
```

Added in: 3.0.0

### constTrue

A thunk that returns always `true`.

```ts
export declare const constTrue: LazyArg<boolean>;
```

Added in: 3.0.0

### constUndefined

A thunk that returns always `undefined`.

```ts
export declare const constUndefined: LazyArg<undefined>;
```

Added in: 3.0.0

### constVoid

A thunk that returns always `void`.

```ts
export declare const constVoid: LazyArg<void>;
```

Added in: 3.0.0

### constant

```ts
export declare const constant: <A>(a: A) => LazyArg<A>;
```

Added in: 3.0.0

### decrement

```ts
export declare const decrement: (n: number) => number;
```

Added in: 3.0.0

### flip

Flips the arguments of a curried function.

```ts
export declare const flip: <A, B, C>(f: (a: A) => (b: B) => C) => (b: B) => (a: A) => C;
```

Added in: 3.0.0

### flow

Performs left-to-right function composition. The first argument may have any arity, the remaining arguments must be unary.

```ts
export declare const flow: { <A extends readonly unknown[], B>(ab: (...a: A) => B): (...a: A) => B; <A extends readonly unknown[], B, C>(ab: (...a: A) => B, bc: (b: B) => C): (...a: A) => C; <A extends readonly unknown[], B, C, D>(ab: (...a: A) => B, bc: (b: B) => C, cd: (c: C) => D): (...a: A) => D; <A extends readonly unknown[], B, C, D, E>(ab: (...a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E): (...a: A) => E; <A extends readonly unknown[], B, C, D, E, F>(ab: (...a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F): (...a: A) => F; <A extends readonly unknown[], B, C, D, E, F, G>(ab: (...a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F, fg: (f: F) => G): (...a: A) => G; <A extends readonly unknown[], B, C, D, E, F, G, H>(ab: (...a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F, fg: (f: F) => G, gh: (g: G) => H): (...a: A) => H; <A extends readonly unknown[], B, C, D, E, F, G, H, I>(ab: (...a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F, fg: (f: F) => G, gh: (g: G) => H, hi: (h: H) => I): (...a: A) => I; <A extends readonly unknown[], B, C, D, E, F, G, H, I, J>(ab: (...a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F, fg: (f: F) => G, gh: (g: G) => H, hi: (h: H) => I, ij: (i: I) => J): (...a: A) => J; };
```

Added in: 3.0.0

### hole

Type hole simulation

```ts
export declare const hole: <T>() => T;
```

Added in: 3.0.0

### identity

```ts
export declare const identity: <A>(a: A) => A;
```

Added in: 3.0.0

### increment

```ts
export declare const increment: (n: number) => number;
```

Added in: 3.0.0

### pipe

Pipes the value of an expression into a pipeline of functions.

```ts
export declare const pipe: { <A>(a: A): A; <A, B>(a: A, ab: (a: A) => B): B; <A, B, C>(a: A, ab: (a: A) => B, bc: (b: B) => C): C; <A, B, C, D>(a: A, ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D): D; <A, B, C, D, E>(a: A, ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E): E; <A, B, C, D, E, F>(a: A, ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F): F; <A, B, C, D, E, F, G>(a: A, ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F, fg: (f: F) => G): G; <A, B, C, D, E, F, G, H>(a: A, ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F, fg: (f: F) => G, gh: (g: G) => H): H; <A, B, C, D, E, F, G, H, I>(a: A, ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F, fg: (f: F) => G, gh: (g: G) => H, hi: (h: H) => I): I; <A, B, C, D, E, F, G, H, I, J>(a: A, ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F, fg: (f: F) => G, gh: (g: G) => H, hi: (h: H) => I, ij: (i: I) => J): J; <A, B, C, D, E, F, G, H, I, J, K>(a: A, ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F, fg: (f: F) => G, gh: (g: G) => H, hi: (h: H) => I, ij: (i: I) => J, jk: (j: J) => K): K; <A, B, C, D, E, F, G, H, I, J, K, L>(a: A, ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F, fg: (f: F) => G, gh: (g: G) => H, hi: (h: H) => I, ij: (i: I) => J, jk: (j: J) => K, kl: (k: K) => L): L; <A, B, C, D, E, F, G, H, I, J, K, L, M>(a: A, ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F, fg: (f: F) => G, gh: (g: G) => H, hi: (h: H) => I, ij: (i: I) => J, jk: (j: J) => K, kl: (k: K) => L, lm: (l: L) => M): M; <A, B, C, D, E, F, G, H, I, J, K, L, M, N>(a: A, ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F, fg: (f: F) => G, gh: (g: G) => H, hi: (h: H) => I, ij: (i: I) => J, jk: (j: J) => K, kl: (k: K) => L, lm: (l: L) => M, mn: (m: M) => N): N; <A, B, C, D, E, F, G, H, I, J, K, L, M, N, O>(a: A, ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F, fg: (f: F) => G, gh: (g: G) => H, hi: (h: H) => I, ij: (i: I) => J, jk: (j: J) => K, kl: (k: K) => L, lm: (l: L) => M, mn: (m: M) => N, no: (n: N) => O): O; <A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P>(a: A, ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F, fg: (f: F) => G, gh: (g: G) => H, hi: (h: H) => I, ij: (i: I) => J, jk: (j: J) => K, kl: (k: K) => L, lm: (l: L) => M, mn: (m: M) => N, no: (n: N) => O, op: (o: O) => P): P; <A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q>(a: A, ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F, fg: (f: F) => G, gh: (g: G) => H, hi: (h: H) => I, ij: (i: I) => J, jk: (j: J) => K, kl: (k: K) => L, lm: (l: L) => M, mn: (m: M) => N, no: (n: N) => O, op: (o: O) => P, pq: (p: P) => Q): Q; <A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R>(a: A, ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F, fg: (f: F) => G, gh: (g: G) => H, hi: (h: H) => I, ij: (i: I) => J, jk: (j: J) => K, kl: (k: K) => L, lm: (l: L) => M, mn: (m: M) => N, no: (n: N) => O, op: (o: O) => P, pq: (p: P) => Q, qr: (q: Q) => R): R; <A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S>(a: A, ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F, fg: (f: F) => G, gh: (g: G) => H, hi: (h: H) => I, ij: (i: I) => J, jk: (j: J) => K, kl: (k: K) => L, lm: (l: L) => M, mn: (m: M) => N, no: (n: N) => O, op: (o: O) => P, pq: (p: P) => Q, qr: (q: Q) => R, rs: (r: R) => S): S; <A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T>(a: A, ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F, fg: (f: F) => G, gh: (g: G) => H, hi: (h: H) => I, ij: (i: I) => J, jk: (j: J) => K, kl: (k: K) => L, lm: (l: L) => M, mn: (m: M) => N, no: (n: N) => O, op: (o: O) => P, pq: (p: P) => Q, qr: (q: Q) => R, rs: (r: R) => S, st: (s: S) => T): T; };
```

Added in: 3.0.0

### tupled

Creates a tupled version of this function: instead of `n` arguments, it accepts a single tuple argument.

```ts
export declare const tupled: <A extends readonly unknown[], B>(f: (...a: A) => B) => (a: A) => B;
```

Added in: 3.0.0

### unsafeCoerce

```ts
export declare const unsafeCoerce: <A, B>(a: A) => B;
```

Added in: 3.0.0

### untupled

Inverse function of `tupled`

```ts
export declare const untupled: <A extends readonly unknown[], B>(f: (a: A) => B) => (...a: A) => B;
```

Added in: 3.0.0

