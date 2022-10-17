## GroupBy

Representation of a grouped stream. This allows to filter which groups will
be processed. Once this is applied all groups will be processed in parallel
and the results will be merged in arbitrary order.

```ts
export interface GroupBy<R, E, K, V, A> {
    readonly [GroupBySym]: GroupBySym;
    readonly [_R]: (_: R) => void;
    readonly [_E]: () => E;
    readonly [_K]: () => K;
    readonly [_V]: () => V;
    readonly [_A]: () => A;
}
```

## General API

### filter

Filter the groups to be processed.

```ts
export declare const filter: <K>(f: Predicate<K>) => <R, E, V, A>(self: GroupBy<R, E, K, V, A>) => GroupBy<R, E, K, V, A>;
```

### first

Only consider the first `n` groups found in the stream.

```ts
export declare const first: (n: number) => <R, E, K, V, A>(self: GroupBy<R, E, K, V, A>) => GroupBy<R, E, K, V, A>;
```

### grouped

```ts
export declare const grouped: <R, E, K, V, A>(self: GroupBy<R, E, K, V, A>) => Stream<R, E, readonly [K, Dequeue<Exit<Maybe<E>, V>>]>;
```

### make

Constructs a new `GroupBy`.

```ts
export declare const make: <R, E, R2, E2, K, V, A>(stream: Stream<R, E, A>, key: (a: A) => Effect<R2, E2, readonly [K, V]>, buffer: number) => GroupBy<R | R2, E | E2, K, V, A>;
```

### mergeGroupBy

Run the function across all groups, collecting the results in an
arbitrary order.

```ts
export declare const mergeGroupBy: <R, E, K, V, A, R1, E1, A1>(f: (k: K, stream: Stream<never, E, V>) => Stream<R1, E1, A1>) => (self: GroupBy<R, E, K, V, A>) => Stream<R | R1, E | E1, A1>;
```

