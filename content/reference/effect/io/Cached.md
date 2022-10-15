## Cached

Reference Documentation for the module '@effect/io/Cached'

A `Cached` is a possibly resourceful value that is loaded into memory, and
which can be refreshed either manually or automatically.

```ts
export interface Cached<Error, Resource> {
    readonly [CachedURI]: {
        _Error: (_: never) => Error;
        _Resource: (_: never) => Resource;
    };
    /**
     * Retrieves the current value stored in the cache.
     */
    get get(): Effect<never, Error, Resource>;
    /**
     * Refreshes the cache. This method will not return until either the refresh
     * is successful, or the refresh operation fails.
     */
    get refresh(): Effect<never, Error, void>;
}
```

## Method

### auto

Creates a new `Cached` value that is automatically refreshed according to
the specified policy. Note that error retrying is not performed
automatically, so if you want to retry on errors, you should first apply
retry policies to the acquisition effect before passing it to this
constructor.

```ts
export declare const auto: <R, Error, Resource, State, Env, In, Out>(acquire: Effect<R, Error, Resource>, policy: Schedule<State, Env, In, Out>) => Effect<Scope | R | Env, never, Cached<Error, Resource>>;
```

### manual

Creates a new `Cached` value that must be manually refreshed by calling
the refresh method. Note that error retrying is not performed
automatically, so if you want to retry on errors, you should first apply
retry policies to the acquisition effect before passing it to this
constructor.

```ts
export declare const manual: <R, Error, Resource>(acquire: Effect<R, Error, Resource>) => Effect<Scope | R, never, Cached<Error, Resource>>;
```

