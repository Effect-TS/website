## SortedByKey

Reference Documentation for the module '@effect/stream/SortedByKey'

A `Stream<R, E, A>` is a description of a program that, when evaluated, may
emit zero or more values of type `A`, may fail with errors of type `E`, and
uses an environment of type `R`. One way to think of `Stream` is as a
`Effect` program that could emit multiple values.

`Stream` is a purely functional *pull* based stream. Pull based streams offer
inherent laziness and backpressure, relieving users of the need to manage
buffers between operators. As an optimization, `Stream` does not emit
single values, but rather an array of values. This allows the cost of effect
evaluation to be amortized.

`Stream` forms a monad on its `A` type parameter, and has error management
facilities for its `E` type parameter, modeled similarly to `Effect` (with
some adjustments for the multiple-valued nature of `Stream`). These aspects
allow for rich and expressive composition of streams.

```ts
export interface Stream<R, E, A> {
    readonly [StreamSym]: StreamSym;
    readonly [_R]: () => R;
    readonly [_E]: () => E;
    readonly [_A]: () => A;
}
```

## General API

### zipAllSortedByKey

Zips this stream that is sorted by distinct keys and the specified stream
that is sorted by distinct keys to produce a new stream that is sorted by
distinct keys. Combines values associated with each key into a tuple,
using the specified values `defaultLeft` and `defaultRight` to fill in
missing values.

This allows zipping potentially unbounded streams of data by key in
constant space but the caller is responsible for ensuring that the
streams are sorted by distinct keys.

```ts
export declare const zipAllSortedByKey: <K, R2, E2, A, A2>(ord: Ord<K>, that: SortedByKey<R2, E2, K, A2>, defaultLeft: A, defaultRight: A2) => <R, E>(self: SortedByKey<R, E, K, A>) => Stream<R2 | R, E2 | E, readonly [K, readonly [A, A2]]>;
```

### zipAllSortedByKeyLeft

Zips this stream that is sorted by distinct keys and the specified stream
that is sorted by distinct keys to produce a new stream that is sorted by
distinct keys. Keeps only values from this stream, using the specified
value `default` to fill in missing values.

This allows zipping potentially unbounded streams of data by key in
constant space but the caller is responsible for ensuring that the
streams are sorted by distinct keys.

```ts
export declare const zipAllSortedByKeyLeft: <K, R2, E2, A2, A>(ord: Ord<K>, that: SortedByKey<R2, E2, K, A2>, def: A) => <R, E>(self: SortedByKey<R, E, K, A>) => Stream<R2 | R, E2 | E, readonly [K, A]>;
```

### zipAllSortedByKeyRight

Zips this stream that is sorted by distinct keys and the specified stream
that is sorted by distinct keys to produce a new stream that is sorted by
distinct keys. Keeps only values from that stream, using the specified
value `default` to fill in missing values.

This allows zipping potentially unbounded streams of data by key in
constant space but the caller is responsible for ensuring that the
streams are sorted by distinct keys.

```ts
export declare const zipAllSortedByKeyRight: <K, R2, E2, A2>(ord: Ord<K>, that: SortedByKey<R2, E2, K, A2>, def: A2) => <R, E, A>(self: SortedByKey<R, E, K, A>) => Stream<R2 | R, E2 | E, readonly [K, A2]>;
```

### zipAllSortedByKeyWith

Zips this stream that is sorted by distinct keys and the specified stream
that is sorted by distinct keys to produce a new stream that is sorted by
distinct keys. Uses the functions `left`, `right`, and `both` to handle
the cases where a key and value exist in this stream, that stream, or
both streams.

This allows zipping potentially unbounded streams of data by key in
constant space but the caller is responsible for ensuring that the
streams are sorted by distinct keys.

```ts
export declare const zipAllSortedByKeyWith: <K, R2, E2, A2, A, C1, C2, C3>(ord: Ord<K>, that: SortedByKey<R2, E2, K, A2>, left: (a: A) => C1, right: (b: A2) => C2, both: (a: A, b: A2) => C3) => <R, E>(self: SortedByKey<R, E, K, A>) => Stream<R2 | R, E2 | E, readonly [K, C1 | C2 | C3]>;
```

