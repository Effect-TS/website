import { TypeLambda, TypeClass, Kind } from "effect/HKT"

export interface Mappable<F extends TypeLambda> extends TypeClass<F> {
  readonly map: <R, O, E, A, B>(
    self: Kind<F, R, O, E, A>,
    f: (a: A) => B
  ) => Kind<F, R, O, E, B>
}
