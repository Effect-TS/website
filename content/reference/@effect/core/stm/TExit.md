## TExit

```ts
export type TExit<A, B> = Fail<A> | Die | Interrupt | Succeed<B> | Retry;
```

## General API

### die

```ts
export declare const die: (e: unknown) => TExit<never, never>;
```

### fail

```ts
export declare const fail: <E>(e: E) => TExit<E, never>;
```

### interrupt

```ts
export declare const interrupt: (fiberId: FiberId) => TExit<never, never>;
```

### retry

```ts
export declare const retry: TExit<never, never>;
```

### succeed

```ts
export declare const succeed: <A>(a: A) => TExit<never, A>;
```

### unifyTExit

```ts
export declare const unifyTExit: <X extends TExit<any, any>>(self: X) => TExit<[X] extends [{ _E: () => infer E; }] ? E : never, [X] extends [{ _A: () => infer A; }] ? A : never>;
```

### unit

```ts
export declare const unit: TExit<never, void>;
```

