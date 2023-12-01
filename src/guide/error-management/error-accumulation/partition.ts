import { Effect } from "effect"

// $ExpectType Effect<never, never, [excluded: string[], satisfying: number[]]>
const program = Effect.partition([0, 1, 2, 3, 4], (n) => {
  if (n % 2 === 0) {
    return Effect.succeed(n)
  } else {
    return Effect.fail(`${n} is not even`)
  }
})

Effect.runPromise(program).then(console.log, console.error)
// Output: [ [ '1 is not even', '3 is not even' ], [ 0, 2, 4 ] ]
