## Ref

Reference Documentation for the module '@effect/io/Ref'

A `Ref` is a purely functional description of a mutable reference. The
fundamental operations of a `Ref` are `set` and `get`. `set` sets the
reference to a new value. `get` gets the current value of the reference.

By default, `Ref` is implemented in terms of compare and swap operations for
maximum performance and does not support performing effects within update
operations. If you need to perform effects within update operations you can
create a `Ref.Synchronized`, a specialized type of `Ref` that supports
performing effects within update operations at some cost to performance. In
this case writes will semantically block other writers, while multiple
readers can read simultaneously.

NOTE: While `Ref` provides the functional equivalent of a mutable reference,
the value inside the `Ref` should normally be immutable since compare and
swap operations are not safe for mutable values that do not support
concurrent access. If you do need to use a mutable value `Ref.Synchronized`
will guarantee that access to the value is properly synchronized.

```ts
export interface Ref<A> {
    /**
     * Internal Discriminator
     */
    get [RefSym](): RefSym;
    /**
     * Internal Variance Marker
     */
    get [_A](): (_: never) => A;
    /**
     * Reads the value from the `Ref`.
     */
    get get(): Effect<never, never, A>;
    /**
     * Atomically modifies the `Ref` with the specified function, which computes a
     * return value for the modification. This is a more powerful version of
     * `update`.
     */
    modify<B>(this: this, f: (a: A) => readonly [B, A]): Effect<never, never, B>;
    /**
     * Writes a new value to the `Ref`, with a guarantee of immediate consistency
     * (at some cost to performance).
     */
    set(this: this, a: A): Effect<never, never, void>;
    /**
     * Atomically writes the specified value to the `Ref`, returning the value
     * immediately before modification.
     */
    getAndSet(this: this, a: A): Effect<never, never, A>;
    /**
     * Atomically modifies the `Ref` with the specified function, returning the
     * value immediately before modification.
     */
    getAndUpdate(this: this, f: (a: A) => A): Effect<never, never, A>;
    /**
     * Atomically modifies the `Ref` with the specified partial function,
     * returning the value immediately before modification. If the function is
     * undefined on the current value it doesn't change it.
     */
    getAndUpdateSome(this: this, pf: (a: A) => Maybe<A>): Effect<never, never, A>;
    /**
     * Atomically modifies the `Ref` with the specified partial function, which
     * computes a return value for the modification if the function is defined on
     * the current value otherwise it returns a default value. This is a more
     * powerful version of `updateSome`.
     */
    modifySome<B>(this: this, fallback: B, pf: (a: A) => Maybe<readonly [B, A]>): Effect<never, never, B>;
    /**
     * Atomically modifies the `Ref` with the specified function.
     */
    update(this: this, f: (a: A) => A): Effect<never, never, void>;
    /**
     * Atomically modifies the `Ref` with the specified function and returns the
     * updated value.
     */
    updateAndGet(this: this, f: (a: A) => A): Effect<never, never, A>;
    /**
     * Atomically modifies the `Ref` with the specified partial function. If the
     * function is undefined on the current value it doesn't change it.
     */
    updateSome(this: this, pf: (a: A) => Maybe<A>): Effect<never, never, void>;
    /**
     * Atomically modifies the `Ref` with the specified partial function. If the
     * function is undefined on the current value it returns the old value without
     * changing it.
     */
    updateSomeAndGet(this: this, pf: (a: A) => Maybe<A>): Effect<never, never, A>;
}
```

## Methods

### makeRef

Creates a new `Ref` with the specified value.

```ts
export declare const makeRef: <A>(value: LazyArg<A>) => Effect<never, never, Ref<A>>;
```

### makeSynchronized

Creates a new `Ref.Synchronized` with the specified value.

```ts
export declare const makeSynchronized: <A>(value: LazyArg<A>) => Effect<never, never, Synchronized<A>>;
```

### unsafeMake

```ts
export declare const unsafeMake: <A>(value: A) => Atomic<A>;
```

### unsafeMakeSynchronized

```ts
export declare const unsafeMakeSynchronized: <A>(initial: A) => Synchronized<A>;
```

