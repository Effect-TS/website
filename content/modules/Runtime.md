## Runtime

Reference Documentation for the module '@effect/core/io/Runtime'

```ts
export declare class Runtime<R> {
    readonly environment: Env<R>;
    readonly runtimeFlags: RuntimeFlags;
    readonly fiberRefs: FiberRefs;
    constructor(environment: Env<R>, runtimeFlags: RuntimeFlags, fiberRefs: FiberRefs);
    unsafeFork: <E, A>(effect: import("../Effect").Effect<R, E, A>) => FiberRuntime<E, A>;
    unsafeRunWith: <E, A>(effect: import("../Effect").Effect<R, E, A>, k: (exit: import("../Exit").Exit<E, A>) => void) => (fiberId: FiberId) => (_: (exit: import("../Exit").Exit<E, A>) => void) => void;
    unsafeRunSync: <E, A>(effect: import("../Effect").Effect<R, E, A>) => A;
    unsafeRunSyncExit: <E, A>(effect: import("../Effect").Effect<R, E, A>) => import("../Exit").Exit<E, A>;
    /**
     * Executes the effect asynchronously, discarding the result of execution.
     *
     * This method is effectful and should only be invoked at the edges of your
     * program.
     */
    unsafeRunAsync: <E, A>(effect: import("../Effect").Effect<R, E, A>) => void;
    /**
     * Executes the effect asynchronously, eventually passing the exit value to
     * the specified callback.
     *
     * This method is effectful and should only be invoked at the edges of your
     * program.
     */
    unsafeRunAsyncWith: <E, A>(effect: import("../Effect").Effect<R, E, A>, k: (exit: import("../Exit").Exit<E, A>) => void) => void;
    /**
     * Runs the `Effect`, returning a JavaScript `Promise` that will be resolved
     * with the value of the effect once the effect has been executed, or will be
     * rejected with the first error or exception throw by the effect.
     *
     * This method is effectful and should only be used at the edges of your
     * program.
     */
    unsafeRunPromise: <E, A>(effect: import("../Effect").Effect<R, E, A>) => Promise<A>;
    /**
     * Runs the `Effect`, returning a JavaScript `Promise` that will be resolved
     * with the `Exit` state of the effect once the effect has been executed.
     *
     * This method is effectful and should only be used at the edges of your
     * program.
     */
    unsafeRunPromiseExit: <E, A>(effect: import("../Effect").Effect<R, E, A>) => Promise<import("../Exit").Exit<E, A>>;
}
```

## Methods

