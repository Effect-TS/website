## TRef

A `TRef` is a purely functional description of a mutable reference that can
be modified as part of a transactional effect. The fundamental operations of
a `TRef` are `set` and `get`. `set` transactionally sets the reference to a
new value. `get` gets the current value of the reference.

NOTE: While `TRef` provides the transactional equivalent of a mutable
reference, the value inside the `TRef` should be immutable. For performance
reasons `TRef` is implemented in terms of compare and swap operations rather
than synchronization. These operations are not safe for mutable values that
do not support concurrent access.

```ts
export interface TRef<A> {
    readonly [TRefSym]: TRefSym;
    readonly [_A]: () => A;
}
```

## General API

### get

Retrieves the value of the `TRef`.

```ts
export declare const get: <A>(self: TRef<A>) => USTM<A>;
```

### getAndSet

Sets the value of the `TRef` and returns the old value.

```ts
export declare const getAndSet: <A>(value: A) => (self: TRef<A>) => STM<never, never, A>;
```

### getAndUpdate

Updates the value of the variable and returns the old value.

```ts
export declare const getAndUpdate: <A>(f: (a: A) => A) => (self: TRef<A>) => STM<never, never, A>;
```

### getAndUpdateSome

Updates some values of the variable but leaves others alone, returning the
old value.

```ts
export declare const getAndUpdateSome: <A>(pf: (a: A) => Maybe<A>) => (self: TRef<A>) => STM<never, never, A>;
```

### make

Makes a new `TRef` that is initialized to the specified value.

```ts
export declare const make: <A>(a: LazyArg<A>) => USTM<TRef<A>>;
```

### makeCommit

Makes a new `TRef` that is initialized to the specified value.

```ts
export declare const makeCommit: <A>(a: LazyArg<A>) => Effect<never, never, TRef<A>>;
```

### modify

Updates the value of the variable, returning a function of the specified
value.

```ts
export declare const modify: <A, B>(f: (a: A) => readonly [B, A]) => (self: TRef<A>) => STM<never, never, B>;
```

### modifySome

Updates the value of the variable, returning a function of the specified
value.

```ts
export declare const modifySome: <A, B>(def: B, pf: (a: A) => Maybe<readonly [B, A]>) => (self: TRef<A>) => STM<never, never, B>;
```

### set

Sets the value of the `TRef`.

```ts
export declare const set: <A>(value: A) => (self: TRef<A>) => STM<never, never, void>;
```

### unsafeGet

Unsafely retrieves the value of the `TRef`.

```ts
export declare const unsafeGet: (journal: Journal) => <A>(self: TRef<A>) => A;
```

### unsafeMake

Unsafely makes a new `TRef` that is initialized to the specified value.

```ts
export declare const unsafeMake: <A>(value: A) => TRef<A>;
```

### unsafeSet

Unsafely sets the value of the `TRef`.

```ts
export declare const unsafeSet: <A>(value: A, journal: Journal) => (self: TRef<A>) => void;
```

### update

Updates the value of the variable.

```ts
export declare const update: <A>(f: (a: A) => A) => (self: TRef<A>) => STM<never, never, void>;
```

### updateAndGet

Updates the value of the variable and returns the new value.

```ts
export declare const updateAndGet: <A>(f: (a: A) => A) => (self: TRef<A>) => STM<never, never, A>;
```

### updateSome

Updates some values of the variable but leaves others alone.

```ts
export declare const updateSome: <A>(pf: (a: A) => Maybe<A>) => (self: TRef<A>) => STM<never, never, void>;
```

### updateSomeAndGet

Updates some values of the variable but leaves others alone.

```ts
export declare const updateSomeAndGet: <A>(pf: (a: A) => Maybe<A>) => (self: TRef<A>) => STM<never, never, A>;
```

