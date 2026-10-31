# Exercise 20: plant a bug, read it as `crashed`

Goal: see a bug in your own code recorded as `crashed`, next to the two `failed` rows from the lesson.

`failed` means the action was attempted and did not succeed: the receiver answered 500, or it did not answer within the timeout. A bug in your own code is a different thing, and the run history says so.

1. In `src/Action.ts`, change the headers line of `postMessage` so it tidies the `Title` header:

   ```ts
   HttpClientRequest.setHeaders({ ...action.headers, Title: action.headers!.Title.trim() }),
   ```

   `pnpm check` passes, because the `!` tells the compiler the headers are there. For `fixtures/rules/post-ok.json`, they are not.

2. With the receiver and the server running, add `fixtures/rules/post-ok.json` and note the id it prints. Run only that rule with `rules run <post-ok id> --event fixtures/events/laptop.json`. Do not use `events submit`: `post-fail` and `post-slow` also match expenses, have no headers either, and would crash too. The CLI prints `crashed: Cannot read properties of undefined (reading 'Title')`, and the server logs `run crashed` at error level, with the stack.

3. Run `runs list`. The three rows from this lesson sit side by side: `failed (status)` from `post-fail.json`, `failed (timeout)` from `post-slow.json`, and `crashed` from this one. In the viewer, all three `Engine.execute` spans are red, and only the crashed one carries a stack.

4. Put the line back: `HttpClientRequest.setHeaders(action.headers ?? {}),`.

Check: `pnpm check` passes, and the same `rules run` against `post-ok.json` prints `succeeded`.

`solution/src/Action.ts` is the file with the bug planted, so you can compare it with yours. The restored file is checkpoint 20's.
