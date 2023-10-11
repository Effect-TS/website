import { Metric, Chunk, Random, Effect } from "effect"

const summary = Metric.summary({
  name: "mySummary",
  maxAge: "1 days",
  maxSize: 100,
  error: 0.03,
  quantiles: Chunk.make(0.1, 0.5, 0.9)
})

const program = summary(Random.nextIntBetween(1, 120)).pipe(Effect.repeatN(99))

Effect.runPromise(
  program.pipe(Effect.flatMap(() => Metric.value(summary)))
).then((summaryState) => console.log("%o", summaryState))
/*
Output:
SummaryState {
  error: 0.03,
  quantiles: {
    _id: 'Chunk',
    values: [
      [ 0.1, { _id: 'Option', _tag: 'Some', value: 17 } ],
      [ 0.5, { _id: 'Option', _tag: 'Some', value: 62 } ],
      [ 0.9, { _id: 'Option', _tag: 'Some', value: 109 } ]
    ]
  },
  count: 100,
  min: 4,
  max: 119,
  sum: 6058,
  ...
}
*/
