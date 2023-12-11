import { TypeLambda } from "./HKT"
import { Either } from "effect"
import { Zippable } from "./Zippable"

export interface EitherTypeLambda extends TypeLambda {
  readonly type: Either.Either<this["Out1"], this["Target"]>
}

export const EitherZippable: Zippable<EitherTypeLambda> = {
  zip: (first, second) => {
    if (Either.isLeft(first)) {
      return Either.left(first.left)
    }
    if (Either.isLeft(second)) {
      return Either.left(second.left)
    }
    return Either.right([first.right, second.right])
  }
}
