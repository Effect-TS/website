# Exercise 24: pause and resume a rule

Goal: add `rules pause <id>` and `rules resume <id>`, tests first, in about 40 minutes.

The lesson says what the program must do, not the steps to get there. Everything you need appeared in an earlier lesson, and the notes below say where.

## What the program must do

- The CLI gets `rules pause <id>` and `rules resume <id>`. The API gets `POST /rules/:id/pause` and `POST /rules/:id/resume`.
- A paused rule stays stored, and `rules list` shows it as `paused`.
- Events skip a paused rule. It gets no row in `runs list` and no `Engine.execute` span.
- Pausing an interval rule stops its loop. Resuming starts it again.
- Pausing or resuming an id the server does not know is a `RuleNotFound`. The CLI prints it as one line and exits with a non-zero code, like `rules remove`.

## 1. Write the tests first

Put them in `test/Pause.test.ts`, on the checkpoint 19 harness in `test/harness.ts`:

1. A paused loop stays quiet. Use an interval rule whose poll never answers. Wait for its first request, pause the rule, then `TestClock.adjust` past one interval. Assert no new request and no new row.
2. A resumed loop runs again. This is the positive control. Resume the rule and adjust past one interval again, staying short of the timeout. Assert exactly one new request and one new row. Without this test, the first one also passes on a loop that never ran.
3. Events skip a paused rule. Pause an event rule and submit an event. Assert no outcome for it and no row. Resume it, submit again, and assert one row.
4. `pause` with an unknown id fails with `RuleNotFound`.

Run them and watch each one fail for the right reason before you write any code.

## 2. Where to look

- The Engine already owns everything that runs a rule: the `FiberMap` of loops from checkpoint 19, and `handleEvent` from checkpoint 21. Keep whether a rule is paused next to them. The run log needs no new outcome. A paused rule does not run, so it writes nothing.
- `stop` already interrupts a loop and waits for its last row. Pausing an interval rule is that, plus remembering the pause. Remember the pause first, then stop the loop. Resuming forgets the pause, then calls `start`.
- `rules list` asks the Engine whether a loop is running. Ask whether the rule is paused in the same way.
- The new endpoints go in `src/api/Api.ts`, next to `remove`, and the CLI gets them from the client with no extra code. Each handler looks the rule up first, so an unknown id fails with `RuleNotFound` as `remove` does.
- Decide what a restart does to a pause, and say so in a comment. Keeping the pause in memory is a fair answer, because a server start already restarts stopped loops. A pause that survives a restart needs a column and a migration, and that takes longer than 40 minutes.

## 3. Show it working

1. Start `pnpm receiver --scenario mixed` and add the four mixed rules.
2. Pause B and submit `fixtures/events/laptop.json`. `runs list` shows three new rows, not four, and the newest `Engine.handleEvent` trace in the viewer has three `Engine.execute` spans.
3. Resume B and submit again. You get four rows and four spans.

Checkpoint 24 is the reference solution, and `checkpoints/24/test/` holds its tests. Run them with `pnpm checkpoint 24 test` after yours pass.
