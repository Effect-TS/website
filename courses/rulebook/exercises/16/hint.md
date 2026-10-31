# Exercise 16: the condition result on the span

Submit `fixtures/events/lunch.json` and `fixtures/events/laptop.json` with the expense rule stored, and open both traces in the viewer. One run is `skipped`, one `succeeded`, and the `Engine.execute` spans carry `rule.id` and `rule.trigger`. Neither says what the condition decided. You can work it out from the outcome, but a span should say it directly, because later you will read many of them side by side.

- In `src/Engine.ts`, the condition is evaluated inside `Engine.execute`, in the expression `!(yield* evaluate(rule, event))`. Give the result a name first.
- `Effect.annotateCurrentSpan("rule.condition", matched)` adds it to the span the code is running in, here `Engine.execute`.
- A rule without a condition has nothing to record. A missing field fails `evaluate` before there is a result, so that span has no attribute either; its row already says `missing field amount`.

Check: with `pnpm dev:server` and the viewer running, `pnpm cli events submit fixtures/events/lunch.json` gives an `Engine.execute` span with `rule.condition` set to `false`, and `laptop.json` one with `true`.

The changed file is in `solution/`. The checkpoints do not include it; nothing later depends on it.
