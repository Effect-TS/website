import { TypeLambda } from "./HKT"
import { Either } from "effect"

export interface EitherTypeLambda extends TypeLambda {
  readonly type: Either.Either<this["Out1"], this["Target"]>
}
