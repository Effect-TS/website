# Exercise 16: the condition result on the span

Goal: make every `Engine.execute` span say what its condition decided.

With the expense rule stored, submit `fixtures/events/lunch.json` and `fixtures/events/laptop.json`, and open both traces in the viewer. One run is `skipped` and one `succeeded`. The `Engine.execute` spans carry `rule.id` and `rule.trigger`, but neither says what the condition decided. You can work it out from the outcome. A span should say it directly, because later you read many of them side by side.

1. In `src/Engine.ts`, find where `Engine.execute` evaluates the condition, in the expression `!(yield* evaluate(rule, event))`. Give the result a name first.
2. Add `Effect.annotateCurrentSpan("rule.condition", matched)`. It adds the attribute to the span the code is running in, which here is `Engine.execute`.
3. Leave the other paths alone. A rule without a condition has nothing to record. A missing field fails `evaluate` before there is a result, so that span has no attribute either. Its row already says `missing field amount`.

Check: with `pnpm dev:server` and the viewer running, `pnpm cli events submit fixtures/events/lunch.json` gives an `Engine.execute` span with `rule.condition` set to `false`, and `laptop.json` gives one with `true`.

The changed file is in `solution/`. The checkpoints do not include it, because nothing later depends on it.
