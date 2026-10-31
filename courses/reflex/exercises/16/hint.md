# Exercise 16: the condition result on the span

With the expense rule stored, submit `fixtures/events/lunch.json` and `fixtures/events/laptop.json`, and open both traces in the viewer. One run is `skipped` and one `succeeded`, and the `Engine.execute` spans carry `rule.id` and `rule.trigger`. Neither span says what the condition decided. You can work it out from the outcome, but a span should say it directly, because later you'll read many of them side by side.

- In `src/Engine.ts`, the condition is evaluated inside `Engine.execute`, in the expression `!(yield* evaluate(rule, event))`. Give the result a name first.
- `Effect.annotateCurrentSpan("rule.condition", matched)` adds it to the span the code is running in, which here is `Engine.execute`.
- A rule without a condition has nothing to record. A missing field fails `evaluate` before there's a result, so that span has no attribute either. Its row already says `missing field amount`.

Check: with `pnpm dev:server` and the viewer running, `pnpm cli events submit fixtures/events/lunch.json` gives an `Engine.execute` span with `rule.condition` set to `false`, and `laptop.json` gives one with `true`.

The changed file is in `solution/`. The checkpoints don't include it, because nothing later depends on it.
