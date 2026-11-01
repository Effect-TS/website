# Exercise 24: pause and resume a rule

Add `rules pause <id>` and `rules resume <id>`, writing the tests first. Allow about 40 minutes.

The lesson gives you the requirements rather than an implementation plan. You have used the necessary techniques in earlier lessons; the notes below point you to them.

## What the program must do

- The CLI must provide `rules pause <id>` and `rules resume <id>`. The API must provide `POST /rules/:id/pause` and `POST /rules/:id/resume`.
- A paused rule remains stored, and `rules list` shows it as `paused`.
- Events skip paused rules without creating a row in `runs list` or an `Engine.execute` span.
- Pausing an interval rule stops its loop; resuming it starts the loop again.
- Pausing or resuming an unknown id must fail with `RuleNotFound`. The CLI prints the error on one line and exits with a non-zero code, as it does for `rules remove`.

## 1. Write the tests first

Write the tests in `test/Pause.test.ts`, using the checkpoint 19 harness in `test/harness.ts`:

1. Verify that a paused loop makes no further requests. Use an interval rule whose poll never answers. Wait for its first request, pause the rule, then use `TestClock.adjust` to advance past one interval. Assert that there is no new request and no new row.
2. Verify that a resumed loop runs again. Resume the rule and advance past one interval again, staying short of the timeout. Assert that there is exactly one new request and one new row. This is the positive control: without it, the first test would also pass for a loop that never ran.
3. Verify that events skip a paused rule. Pause an event rule and submit an event. Assert that there is no outcome for that rule and no row. Resume the rule, submit again, and assert that there is one row.
4. Verify that `pause` with an unknown id fails with `RuleNotFound`.

Run the tests and confirm that each fails for the expected reason before writing the implementation.

## 2. Where to look

- The Engine already manages the `FiberMap` of loops from checkpoint 19 and `handleEvent` from checkpoint 21. Store the paused state there too. Event dispatch and interval loops do not execute paused rules, so they create no run-log rows for them. Explicit `rules run` calls are outside this pause check; no new run outcome is needed.
- `stop` shows how to interrupt a loop and wait for its final run-log update. To pause an interval rule, record its paused state first, then interrupt the loop in the same way. To resume it, clear that state and call `start`.
- `rules list` already asks the Engine whether a loop is running. Use the same approach to ask whether a rule is paused.
- Add the endpoints in `src/api/Api.ts`, next to `remove`. The client derives methods for them automatically; use these methods in the new CLI commands. Each handler should look up the rule first so that an unknown id fails with `RuleNotFound`, as it does for `remove`.
- Decide whether a pause survives a restart and document the behavior in a comment. Storing the paused state in memory is acceptable because starting the server already restarts stopped loops. Preserving a pause across restarts requires a column and a migration, which would take this exercise beyond 40 minutes.

## 3. Show it working

1. Start `pnpm receiver --scenario mixed` and add the four mixed rules.
2. Pause B and submit `fixtures/events/laptop.json`. `runs list` shows three new rows, not four, and the newest `Engine.handleEvent` trace in the viewer has three `Engine.execute` spans.
3. Resume B and submit again. This time, you should get four new rows and four spans.

Checkpoint 24 is the reference solution, with tests in `checkpoints/24/test/`. After your tests pass, run the reference tests with `pnpm checkpoint 24 test`.
