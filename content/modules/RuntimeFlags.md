## RuntimeFlags

Reference Documentation for the module '@effect/core/io/RuntimeFlags'

```ts
export type RuntimeFlags = number & {
    readonly RuntimeFlags: unique symbol;
};
```

## Methods

### cooperativeYielding

```ts
/**
 * @tsplus getter effect/core/io/RuntimeFlags cooperativeYielding
 */
export declare const cooperativeYielding: (self: RuntimeFlags) => boolean;
```

### currentFiber

```ts
/**
 * @tsplus getter effect/core/io/RuntimeFlags currentFiber
 */
export declare const currentFiber: (self: RuntimeFlags) => boolean;
```

### diff

```ts
/**
 * @tsplus getter effect/core/io/RuntimeFlags diff
 */
export declare const diff: (that: RuntimeFlags) => (self: RuntimeFlags) => RuntimeFlagsPatch;
```

### disable

```ts
/**
 * @tsplus pipeable effect/core/io/RuntimeFlags disable
 */
export declare const disable: (flag: Flag) => (self: RuntimeFlags) => RuntimeFlags;
```

### disableAll

```ts
/**
 * @tsplus pipeable effect/core/io/RuntimeFlags disableAll
 */
export declare const disableAll: (flags: RuntimeFlags) => (self: RuntimeFlags) => RuntimeFlags;
```

### enable

```ts
/**
 * @tsplus pipeable effect/core/io/RuntimeFlags enable
 */
export declare const enable: (flag: Flag) => (self: RuntimeFlags) => RuntimeFlags;
```

### enableAll

```ts
/**
 * @tsplus pipeable effect/core/io/RuntimeFlags enableAll
 */
export declare const enableAll: (flags: RuntimeFlags) => (self: RuntimeFlags) => RuntimeFlags;
```

### fiberRoots

```ts
/**
 * @tsplus getter effect/core/io/RuntimeFlags fiberRoots
 */
export declare const fiberRoots: (self: RuntimeFlags) => boolean;
```

### interruptible

```ts
/**
 * @tsplus getter effect/core/io/RuntimeFlags interruptible
 */
export declare const interruptible: (self: RuntimeFlags) => boolean;
```

### interruption

```ts
/**
 * @tsplus getter effect/core/io/RuntimeFlags interruption
 */
export declare const interruption: (self: RuntimeFlags) => boolean;
```

### isDisabled

```ts
/**
 * @tsplus pipeable effect/core/io/RuntimeFlags isDisabled
 */
export declare const isDisabled: (flag: Flag) => (self: RuntimeFlags) => boolean;
```

### isEnabled

```ts
/**
 * @tsplus pipeable effect/core/io/RuntimeFlags isEnabled
 */
export declare const isEnabled: (flag: Flag) => (self: RuntimeFlags) => boolean;
```

### opLog

```ts
/**
 * @tsplus getter effect/core/io/RuntimeFlags opLog
 */
export declare const opLog: (self: RuntimeFlags) => boolean;
```

### opSupervision

```ts
/**
 * @tsplus getter effect/core/io/RuntimeFlags opSupervision
 */
export declare const opSupervision: (self: RuntimeFlags) => boolean;
```

### patch

```ts
/**
 * @tsplus pipeable effect/core/io/RuntimeFlags patch
 */
export declare const patch: (patch: RuntimeFlagsPatch) => (self: RuntimeFlags) => RuntimeFlags;
```

### render

```ts
/**
 * @tsplus getter effect/core/io/RuntimeFlags render
 */
export declare const render: (flags: RuntimeFlags) => string;
```

### runtimeMetrics

```ts
/**
 * @tsplus getter effect/core/io/RuntimeFlags opLog
 */
export declare const runtimeMetrics: (self: RuntimeFlags) => boolean;
```

### toSet

```ts
/**
 * @tsplus getter effect/core/io/RuntimeFlags toSet
 */
export declare const toSet: (self: RuntimeFlags) => Set<Flag>;
```

### windDown

```ts
/**
 * @tsplus getter effect/core/io/RuntimeFlags windDown
 */
export declare const windDown: (self: RuntimeFlags) => boolean;
```

