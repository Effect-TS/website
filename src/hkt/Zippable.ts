import { Kind, TypeClass, TypeLambda } from "./HKT"

export interface Zippable<F extends TypeLambda> extends TypeClass<F> {
  readonly zip: <R1, O1, E1, A, R2, O2, E2, B>(
    first: Kind<F, R1, O1, E1, A>,
    second: Kind<F, R2, O2, E2, B>
  ) => Kind<F, R1 & R2, O1 | O2, E1 | E2, readonly [A, B]>
}

export const zip =
  <F extends TypeLambda>(Zippable: Zippable<F>) =>
  <R2, O2, E2, B>(that: Kind<F, R2, O2, E2, B>) =>
  <R1, O1, E1, A>(
    self: Kind<F, R1, O1, E1, A>
  ): Kind<F, R1 & R2, O1 | O2, E1 | E2, readonly [A, B]> =>
    Zippable.zip(self, that)
