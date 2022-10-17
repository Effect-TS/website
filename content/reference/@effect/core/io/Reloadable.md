## Reloadable

Reference Documentation for the module '@effect/io/Reloadable'

A `Reloadable` is an implementation of some service that can be dynamically
reloaded, or swapped out for another implementation on-the-fly.

```ts
export interface Reloadable<Service> {
    readonly [ReloadableURI]: {
        _Service: (_: never) => Service;
    };
    readonly scopedRef: ScopedRef<Service>;
    readonly reload: Effect<never, unknown, void>;
    /**
     * Retrieves the current version of the reloadable service.
     */
    get get(): Effect<never, never, Service>;
    /**
     * Forks the reload of the service in the background, ignoring any errors.
     */
    get reloadFork(): Effect<never, never, void>;
}
```

## General API

### auto

Makes a new reloadable service from a layer that describes the construction
of a static service. The service is automatically reloaded according to the
provided schedule.

```ts
export declare const auto: <In, E, Out, State, Env, Out2>(outTag: Tag<Out>, layer: Layer<In, E, Out>, policy: Schedule<State, Env, In, Out2>) => Layer<In | Env, E, Reloadable<Out>>;
```

### autoFromConfig

Makes a new reloadable service from a layer that describes the construction
of a static service. The service is automatically reloaded according to a
schedule, which is extracted from the input to the layer.

```ts
export declare const autoFromConfig: <In, E, Out, State, R, Out2>(outTag: Tag<Out>, layer: Layer<In, E, Out>, scheduleFromConfig: (env: Env<In>) => Schedule<State, R, In, Out2>) => Layer<In | R, E, Reloadable<Out>>;
```

### get

```ts
export declare const get: <Service>(tag: Tag<Service>) => Effect<Reloadable<Service>, never, Service>;
```

### manual

Makes a new reloadable service from a layer that describes the construction
of a static service.

```ts
export declare const manual: <In, E, Out>(outTag: Tag<Out>, layer: Layer<In, E, Out>) => Layer<In, E, Reloadable<Out>>;
```

### reload

```ts
export declare const reload: <Service>(tag: Tag<Service>) => Effect<Reloadable<Service>, unknown, void>;
```

### reloadFork

```ts
export declare const reloadFork: <Service>(tag: Tag<Service>) => Effect<Reloadable<Service>, never, void>;
```

### reloadableTag

```ts
export declare const reloadableTag: <S>(tag: Tag<S>) => Tag<Reloadable<S>>;
```

