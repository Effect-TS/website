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
  occurrences: Map(9) {
    'Error-7' => 12,
    'Error-2' => 12,
    'Error-4' => 14,
    'Error-1' => 14,
    'Error-9' => 8,
    'Error-6' => 11,
    'Error-5' => 9,
    'Error-3' => 14,
    'Error-8' => 6
  },
  ...
}
*/
