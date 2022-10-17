## InterruptStatus

The `InterruptStatus` of a fiber determines whether or not it can be
interrupted. The status can change over time in different regions.

```ts
export interface InterruptStatus extends Equals {
    readonly isInterruptible: boolean;
    readonly isUninterruptible: boolean;
    readonly toBoolean: boolean;
}
```

## General API

### fromBoolean

```ts
export declare const fromBoolean: (b: boolean) => InterruptStatus;
```

