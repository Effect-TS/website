## HKT

Reference Documentation for the module '@fp-ts/core/HKT'

```ts
export interface TypeLambda {
    readonly InOut1: unknown;
    readonly In1: unknown;
    readonly Out3: unknown;
    readonly Out2: unknown;
    readonly Out1: unknown;
}
```

```ts
export declare type Kind<F extends TypeLambda, InOut1, In1, Out3, Out2, Out1> = F extends {
    readonly type: unknown;
} ? (F & {
    readonly InOut1: InOut1;
    readonly In1: In1;
    readonly Out3: Out3;
    readonly Out2: Out2;
    readonly Out1: Out1;
})['type'] : {
    readonly F: F;
    readonly InOut1: (_: InOut1) => InOut1;
    readonly In1: (_: In1) => void;
    readonly Out3: () => Out3;
    readonly Out2: () => Out2;
    readonly Out1: () => Out1;
};
```

```ts
export interface TypeClass<F extends TypeLambda> {
    readonly [URI]?: F;
}
```

