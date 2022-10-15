## TDeferred

Reference Documentation for the module '@effect/stm/TDeferred'

```ts
export interface TDeferred<E, A> {
    readonly [TDeferredSym]: TDeferredSym;
    readonly [_E]: () => E;
    readonly [_A]: () => A;
}
```

## General API

### await

```ts
export declare const await: <E, A>(self: TDeferred<E, A>) => STM<never, E, A>;
```

### await_

```ts
export declare const await_: <E, A>(self: TDeferred<E, A>) => STM<never, E, A>;
```

### done

```ts
export declare const done: <E, A>(value: Either<E, A>) => (self: TDeferred<E, A>) => STM<never, never, boolean>;
```

### fail

```ts
export declare const fail: <E>(error: E) => <A>(self: TDeferred<E, A>) => STM<never, never, boolean>;
```

### make

```ts
export declare const make: <E, A>() => USTM<TDeferred<E, A>>;
```

### poll

```ts
export declare const poll: <E, A>(self: TDeferred<E, A>) => USTM<Maybe<Either<E, A>>>;
```

### succeed

```ts
export declare const succeed: <A>(value: A) => <E>(self: TDeferred<E, A>) => STM<never, never, boolean>;
```

