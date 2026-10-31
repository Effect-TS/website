# Exercise 24: pause and resume a rule

This one is yours: the lesson gives the behaviour, not the steps. Budget about 40 minutes. Everything you need has appeared before; the notes below point at where.

## The behaviour

- `rules pause <id>` and `rules resume <id>` in the CLI, `POST /rules/:id/pause` and `POST /rules/:id/resume` in the API.
- A paused rule stays stored and `rules list` shows it as `paused`.
- Events skip a paused rule: no row in `runs list` and no `Engine.execute` span.
- Pausing an interval rule stops its loop. Resuming starts it again.
- Pausing or resuming an id the server doesn't know is a `RuleNotFound`, printed by the CLI as one line, with a non-zero exit, like `rules remove`.

## Tests first

Write them in `test/Pause.test.ts`, on the lesson 19 harness in `test/harness.ts`:

1. An interval rule whose poll never answers. Wait for its first request, pause it, then `TestClock.adjust` past one interval: no new request and no new row.
2. The positive control. Resume it and adjust past one interval again, staying short of the timeout: exactly one new request and one new row. Without this, test 1 would also pass on a loop that never ran.
3. An event rule. Pause it, submit an event: no outcome for it and no row. Resume it, submit again: one row.
4. `pause` with an unknown id fails with `RuleNotFound`.

## Where to look

- The Engine already owns everything that runs a rule: the `FiberMap` of loops from lesson 19 and `handleEvent` from lesson 21. Whether a rule is paused can live next to them. The run log needs no new outcome: a paused rule doesn't run, so it writes nothing.
- `stop` already interrupts a loop and waits for its last row. Pausing an interval rule is that, plus remembering the pause. Resuming is `start`.
- `rules list` asks the Engine whether a loop runs; it can ask whether the rule is paused the same way.
- New endpoints go in `src/api/Api.ts` next to `remove`, and the CLI gets them from the client with no extra code. Each handler looks the rule up first, so an unknown id fails with `RuleNotFound` as `remove` does.
- Decide what a restart does to a pause, and say so in a comment. Keeping it in memory is a fair answer: a server start already restarts stopped loops. If you want it to survive, it needs a column and a migration, and that takes longer than 40 minutes.

## Show it

Run the mixed scenario (`pnpm receiver --scenario mixed`, then add the four rules), pause B, and submit `fixtures/events/laptop.json`. `runs list` shows three new rows, not four, and the viewer's newest `Engine.handleEvent` trace has three `Engine.execute` spans. Resume B and submit again: four rows, four spans.

Checkpoint 24 is the reference solution, and `checkpoints/24/test/` holds its tests.
