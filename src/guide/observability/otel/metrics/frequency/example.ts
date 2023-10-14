import { Metric, Random, Effect } from "effect"

const errorFrequency = Metric.frequency("error_frequency")

const program = errorFrequency(
  Random.nextIntBetween(1, 10).pipe(Effect.map((n) => `Error-${n}`))
).pipe(Effect.repeatN(99))

Effect.runPromise(
  program.pipe(Effect.flatMap(() => Metric.value(errorFrequency)))
).then((frequencyState) => console.log("%o", frequencyState))
/*
Output:
FrequencyState {
  occurrences: {
    _id: 'HashMap',
    values: [
      [ 'Error-9', 20 ],
      [ 'Error-8', 7 ],
      [ 'Error-3', 15 ],
      [ 'Error-2', 7 ],
      [ 'Error-1', 11 ],
      [ 'Error-7', 7 ],
      [ 'Error-6', 5 ],
      [ 'Error-5', 12 ],
      [ 'Error-4', 16 ]
    ]
  },
  ...
}
*/
