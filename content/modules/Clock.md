## Clock

Reference Documentation for the module '@effect/core/io/Clock'

```ts
export interface Clock {
    readonly [ClockSym]: ClockSym;
    readonly currentTime: Effect<never, never, number>;
    readonly unsafeCurrentTime: number;
    readonly scheduler: Effect<never, never, Clock.Scheduler>;
    readonly sleep: (duration: Duration) => Effect<never, never, void>;
}
```

## Methods

### currentTime

```ts
/**
 * @tsplus static effect/core/io/Clock.Ops currentTime
 */
export declare const currentTime: Effect<never, never, number>;
```

### globalScheduler

```ts
/**
 * @tsplus static effect/core/io/Clock/Scheduler.Ops globalScheduler
 */
export declare const globalScheduler: Scheduler;
```

### sleep

```ts
/**
 * @tsplus static effect/core/io/Clock.Ops sleep
 */
export declare const sleep: (duration: Duration) => Effect<never, never, void>;
```

