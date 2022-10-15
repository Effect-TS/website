## RuntimeFlags

Reference Documentation for the module '@effect/io/RuntimeFlags'

```ts
export type RuntimeFlags = number & {
    readonly RuntimeFlags: unique symbol;
};
```

## Methods

### cooperativeYielding

```ts
export declare const cooperativeYielding: (self: RuntimeFlags) => boolean;
```

### currentFiber

```ts
export declare const currentFiber: (self: RuntimeFlags) => boolean;
```

### diff

```ts
export declare const diff: (that: RuntimeFlags) => (self: RuntimeFlags) => RuntimeFlagsPatch;
```

### disable

```ts
export declare const disable: (flag: Flag) => (self: RuntimeFlags) => RuntimeFlags;
```

### disableAll

```ts
export declare const disableAll: (flags: RuntimeFlags) => (self: RuntimeFlags) => RuntimeFlags;
```

### enable

```ts
export declare const enable: (flag: Flag) => (self: RuntimeFlags) => RuntimeFlags;
```

### enableAll

```ts
export declare const enableAll: (flags: RuntimeFlags) => (self: RuntimeFlags) => RuntimeFlags;
```

### fiberRoots

```ts
export declare const fiberRoots: (self: RuntimeFlags) => boolean;
```

### interruptible

```ts
export declare const interruptible: (self: RuntimeFlags) => boolean;
```

### interruption

```ts
export declare const interruption: (self: RuntimeFlags) => boolean;
```

### isDisabled

```ts
export declare const isDisabled: (flag: Flag) => (self: RuntimeFlags) => boolean;
```

### isEnabled

```ts
export declare const isEnabled: (flag: Flag) => (self: RuntimeFlags) => boolean;
```

### opLog

```ts
export declare const opLog: (self: RuntimeFlags) => boolean;
```

### opSupervision

```ts
export declare const opSupervision: (self: RuntimeFlags) => boolean;
```

### patch

```ts
export declare const patch: (patch: RuntimeFlagsPatch) => (self: RuntimeFlags) => RuntimeFlags;
```

### render

```ts
export declare const render: (flags: RuntimeFlags) => string;
```

### runtimeMetrics

```ts
export declare const runtimeMetrics: (self: RuntimeFlags) => boolean;
```

### toSet

```ts
export declare const toSet: (self: RuntimeFlags) => Set<Flag>;
```

### windDown

```ts
export declare const windDown: (self: RuntimeFlags) => boolean;
```

