export interface TypeLambda {
  readonly In: unknown
  readonly Out2: unknown
  readonly Out1: unknown
  readonly Target: unknown
}

export type Kind<F extends TypeLambda, In, Out2, Out1, Target> = F extends {
  readonly type: unknown
}
  ? (F & {
      readonly In: In
      readonly Out2: Out2
      readonly Out1: Out1
      readonly Target: Target
    })["type"]
  : {
      readonly F: F
      readonly In: (_: In) => void // Contravariant
      readonly Out2: () => Out2 // Covariant
      readonly Out1: () => Out1 // Covariant
      readonly Target: (_: Target) => Target // Invariant
    }

export declare const URI: unique symbol

export interface TypeClass<F extends TypeLambda> {
  // To improve inference it is necessary to mention the F parameter inside it
  // otherwise it will be lost, we can do so by adding an optional property
  readonly [URI]?: F
}
