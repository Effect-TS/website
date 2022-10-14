## Cached

Reference Documentation for the module '@effect/core/io/Cached'

### auto

Creates a new `Cached` value that is automatically refreshed according to
the specified policy. Note that error retrying is not performed
automatically, so if you want to retry on errors, you should first apply
retry policies to the acquisition effect before passing it to this
constructor.

```ts
/**
 * @tsplus static effect/core/io/Cached.Ops auto
 */
export declare const auto: <R, Error, Resource, State, Env, In, Out>(acquire: Effect<R, Error, Resource>, policy: Schedule<State, Env, In, Out>) => Effect<Scope | R | Env, never, Cached<Error, Resource>>;
```

### manual

Creates a new `Cached` value that must be manually refreshed by calling
the refresh method. Note that error retrying is not performed
automatically, so if you want to retry on errors, you should first apply
retry policies to the acquisition effect before passing it to this
constructor.

```ts
/**
 * @tsplus static effect/core/io/Cached.Ops manual
 */
export declare const manual: <R, Error, Resource>(acquire: Effect<R, Error, Resource>) => Effect<Scope | R, never, Cached<Error, Resource>>;
```

