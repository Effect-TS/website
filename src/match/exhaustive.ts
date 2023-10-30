import { Match, Either } from "effect"

const result = Match.value(Either.right(0)).pipe(
  Match.when({ _tag: "Right" }, (_) => _.right),
  // @ts-expect-error
  Match.exhaustive // TypeError! Type 'Left<never, number>' is not assignable to type 'never'
)
