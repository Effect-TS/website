import { Match, Either } from "effect"

// $ExpectType Option<number>
const result = Match.value(Either.right(0)).pipe(
  Match.when({ _tag: "Right" }, (_) => _.right),
  Match.option
)

console.log(result) // Output: { _id: 'Option', _tag: 'Some', value: 0 }
