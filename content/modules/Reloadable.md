## Reloadable

Reference Documentation for the module '@effect/core/io/Reloadable'

### auto

Makes a new reloadable service from a layer that describes the construction
of a static service. The service is automatically reloaded according to the
provided schedule.

```ts
/**
 * @tsplus static effect/core/io/Reloadable.Ops auto
 */
export declare const auto: <In, E, Out, State, Env, Out2>(outTag: Tag<Out>, layer: Layer<In, E, Out>, policy: Schedule<State, Env, In, Out2>) => Layer<In | Env, E, Reloadable<Out>>;
```

### autoFromConfig

Makes a new reloadable service from a layer that describes the construction
of a static service. The service is automatically reloaded according to a
schedule, which is extracted from the input to the layer.

```ts
/**
 * @tsplus static effect/core/io/Reloadable.Ops autoFromConfig
 */
export declare const autoFromConfig: <In, E, Out, State, R, Out2>(outTag: Tag<Out>, layer: Layer<In, E, Out>, scheduleFromConfig: (env: Env<In>) => Schedule<State, R, In, Out2>) => Layer<In | R, E, Reloadable<Out>>;
```

### get

```ts
/**
 * @tsplus static effect/core/io/Reloadable.Ops get
 */
export declare const get: <Service>(tag: Tag<Service>) => Effect<Reloadable<Service>, never, Service>;
```

### manual

Makes a new reloadable service from a layer that describes the construction
of a static service.

```ts
/**
 * @tsplus static effect/core/io/Reloadable.Ops manual
 */
export declare const manual: <In, E, Out>(outTag: Tag<Out>, layer: Layer<In, E, Out>) => Layer<In, E, Reloadable<Out>>;
```

### reload

```ts
/**
 * @tsplus static effect/core/io/Reloadable.Ops reload
 */
export declare const reload: <Service>(tag: Tag<Service>) => Effect<Reloadable<Service>, unknown, void>;
```

### reloadFork

```ts
/**
 * @tsplus static effect/core/io/Reloadable.Ops reloadFork
 */
export declare const reloadFork: <Service>(tag: Tag<Service>) => Effect<Reloadable<Service>, never, void>;
```

### reloadableTag

```ts
export declare const reloadableTag: <S>(tag: Tag<S>) => Tag<Reloadable<S>>;
```

