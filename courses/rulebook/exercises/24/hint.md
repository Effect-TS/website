# Exercise 24: pause and resume a rule

This one is yours. The lesson describes what the program should do, not the steps to get there. Budget about 40 minutes. Everything you need has appeared in an earlier lesson, and the notes below point you to where.

## What the program should do

- The CLI gets `rules pause <id>` and `rules resume <id>`. The API gets `POST /rules/:id/pause` and `POST /rules/:id/resume`.
- A paused rule stays stored, and `rules list` shows it as `paused`.
- Events skip a paused rule. It gets no row in `runs list` and no `Engine.execute` span.
- Pausing an interval rule stops its loop. Resuming starts it again.
- Pausing or resuming an id the server doesn't know is a `RuleNotFound`. The CLI prints it as one line and exits with a non-zero code, like `rules remove`.

## Write the tests first

Put them in `test/Pause.test.ts`, on the lesson 19 harness in `test/harness.ts`:

1. A paused loop stays quiet. Use an interval rule whose poll never answers. Wait for its first request, pause the rule, then `TestClock.adjust` past one interval. There should be no new request and no new row.
2. A resumed loop runs again. This is the positive control. Resume the rule and adjust past one interval again, staying short of the timeout. There should be exactly one new request and one new row. Without this test, test 1 would also pass on a loop that never ran.
3. Events skip a paused rule. Pause an event rule and submit an event. There should be no outcome for it and no row. Resume it, submit again, and there should be one row.
4. `pause` with an unknown id fails with `RuleNotFound`.

## Where to look

- The Engine already owns everything that runs a rule: the `FiberMap` of loops from lesson 19, and `handleEvent` from lesson 21. Whether a rule is paused can live next to them. The run log doesn't need a new outcome. A paused rule doesn't run, so it writes nothing.
- `stop` already interrupts a loop and waits for its last row. Pausing an interval rule is that, plus remembering the pause. Resuming is `start`.
- `rules list` asks the Engine whether a loop is running. It can ask whether the rule is paused in the same way.
- The new endpoints go in `src/api/Api.ts`, next to `remove`, and the CLI gets them from the client with no extra code. Each handler looks the rule up first, so an unknown id fails with `RuleNotFound` as `remove` does.
- Decide what a restart does to a pause, and say so in a comment. Keeping the pause in memory is a fair answer, because a server start already restarts stopped loops. If you want a pause to survive a restart, it needs a column and a migration, and that takes longer than 40 minutes.

## Show it working

Run the mixed scenario: start `pnpm receiver --scenario mixed`, then add the four rules. Pause B and submit `fixtures/events/laptop.json`. `runs list` shows three new rows, not four, and the newest `Engine.handleEvent` trace in the viewer has three `Engine.execute` spans. Resume B and submit again, and you get four rows and four spans.

Checkpoint 24 is the reference solution, and `checkpoints/24/test/` holds its tests.
