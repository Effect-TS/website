# Exercise 16: record the condition result on the span

Record the condition result on each `Engine.execute` span that evaluates a condition.

With the expense rule stored, submit `fixtures/events/lunch.json` and `fixtures/events/laptop.json`, then open both traces in the viewer. One run is `skipped` and the other `succeeded`. Their `Engine.execute` spans have `rule.id` and `rule.trigger` attributes, but neither records the result of the condition. You can infer it from the outcome, but recording it directly makes several spans easier to compare.

1. In `src/Engine.ts`, find the expression `!(yield* evaluate(rule, event))` in `Engine.execute`. Store the result of `evaluate` in a variable named `matched` before checking it.
2. Add `Effect.annotateCurrentSpan("rule.condition", matched)`. This adds the attribute to the current span, which here is `Engine.execute`.
3. Leave the other paths alone. A rule without a condition has no result to record, and a missing field makes `evaluate` fail before it returns one, so that span has no attribute either. Its row already says `missing field amount`.

With `pnpm dev:server` and the viewer running, run `pnpm cli events submit fixtures/events/lunch.json`. The `Engine.execute` span now carries `rule.condition` set to `false`. Submit `laptop.json` and the new span has it set to `true`.

The changed file is in `solution/`. The checkpoints do not include it, because nothing later depends on it.
