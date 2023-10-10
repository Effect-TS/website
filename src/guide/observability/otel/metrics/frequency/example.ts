import { Metric, Random, Effect } from "effect"

const freq = Metric.frequency("MySet")

const program = freq(
  Random.nextIntBetween(1, 10).pipe(Effect.map((n) => `MyKey-${n}`))
).pipe(
  Effect.repeatN(99),
  Effect.flatMap(() => Metric.value(freq))
)

Effect.runPromise(program).then((frequencyState) =>
  console.log("%o", frequencyState)
)
/*
Output:
FrequencyState {
  occurrences: {
    _id: 'HashMap',
    values: [
      [ 'MyKey-9', 20 ],
      [ 'MyKey-8', 7 ],
      [ 'MyKey-3', 15 ],
      [ 'MyKey-2', 7 ],
      [ 'MyKey-1', 11 ],
      [ 'MyKey-7', 7 ],
      [ 'MyKey-6', 5 ],
      [ 'MyKey-5', 12 ],
      [ 'MyKey-4', 16 ]
    ]
  },
  ...
}
*/
