# Exercise 20: introduce a bug and find its `crashed` run

Introduce a bug in your own code and find the resulting `crashed` row alongside the two `failed` rows from the lesson.

The `failed` rows record actions that were attempted but did not succeed because the receiver returned 500 or did not respond within the timeout. A bug in your own code is recorded separately as `crashed`.

1. In `src/Action.ts`, change the headers line of `postMessage` to trim the `Title` header:

   ```ts
   HttpClientRequest.setHeaders({ ...action.headers, Title: action.headers!.Title.trim() }),
   ```

   `pnpm check` passes because the `!` tells the compiler that the headers are present. That assertion is wrong for `fixtures/rules/post-ok.json`, which has no headers.

2. With the receiver and the server running, add `fixtures/rules/post-ok.json` and note the printed id. Run only that rule with `rules run <post-ok id> --event fixtures/events/laptop.json`. Avoid `events submit` here because `post-fail` and `post-slow` also match expenses and have no headers, so they would crash too. The CLI should print `crashed: Cannot read properties of undefined (reading 'Title')`. The server should log `run crashed` at error level, including the stack trace.

3. Run `runs list` to compare the three rows from this lesson: `failed (status)` from `post-fail.json`, `failed (timeout)` from `post-slow.json`, and `crashed` from this rule. In the viewer, all three `Engine.execute` spans are red, but only the crashed run's span has a stack trace.

4. Put the line back: `HttpClientRequest.setHeaders(action.headers ?? {}),`.

After restoring the line, confirm that `pnpm check` passes and the same `rules run` against `post-ok.json` prints `succeeded`.

`solution/src/Action.ts` contains the deliberate bug for comparison. Checkpoint 20 contains the restored version.
