## Clock

Reference Documentation for the module '@effect/io/Clock'

```ts
export interface Clock {
    readonly [ClockSym]: ClockSym;
    readonly currentTime: Effect<never, never, number>;
    readonly unsafeCurrentTime: number;
    readonly scheduler: Effect<never, never, Clock.Scheduler>;
    readonly sleep: (duration: Duration) => Effect<never, never, void>;
}
```

## Method

### currentTime

```ts
export declare const currentTime: Effect<never, never, number>;
```

### globalScheduler

```ts
export declare const globalScheduler: Scheduler;
```

### sleep

```ts
export declare const sleep: (duration: Duration) => Effect<never, never, void>;
```

