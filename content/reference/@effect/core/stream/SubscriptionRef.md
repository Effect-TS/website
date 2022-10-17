## SubscriptionRef

A `SubscriptionRef<A>` is a `Ref` that can be subscribed to in order to
receive the current value as well as all changes to the value.

```ts
export interface SubscriptionRef<A> extends Ref.Synchronized<A> {
    /**
     * Internal Discriminator
     */
    get [SubscriptionRefSym](): SubscriptionRefSym;
    /**
     * A stream containing the current value of the `Ref` as well as all changes
     * to that value.
     */
    get changes(): Stream.UIO<A>;
}
```

## General API

### make

Creates a new `SubscriptionRef` with the specified value.

```ts
export declare const make: <A>(value: LazyArg<A>) => Effect<never, never, SubscriptionRef<A>>;
```

