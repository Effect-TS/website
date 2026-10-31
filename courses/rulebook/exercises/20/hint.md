# Exercise 20: plant a bug, read it as `crashed`

`failed` means the action was attempted and did not succeed: the receiver answered 500, or did not answer within the timeout. A bug in your own code is something else, and the run history should say so. Plant one for two minutes and read it next to the other two.

1. In `src/Action.ts`, change the headers line of `postMessage` so it tidies the `Title` header:

   ```ts
   HttpClientRequest.setHeaders({ ...action.headers, Title: action.headers!.Title.trim() }),
   ```

   `pnpm check` passes: the `!` tells the compiler the headers are there. They are not, for `fixtures/rules/post-ok.json`.

2. With the receiver and the server running, add `fixtures/rules/post-ok.json` and submit `fixtures/events/laptop.json`. The CLI prints `crashed: Cannot read properties of undefined (reading 'Title')`, and the server logs `run crashed` at error level with the stack.

3. Run `runs list`. The three rows from this lesson sit side by side: `failed (status)` from `post-fail.json`, `failed (timeout)` from `post-slow.json`, `crashed` from this one. In the viewer all three `Engine.execute` spans are red; only the crashed one carries a stack.

4. Put the line back: `HttpClientRequest.setHeaders(action.headers ?? {}),`.

Check: `pnpm check` passes, and the same event against `post-ok.json` prints `succeeded`.

`solution/src/Action.ts` is the file with the bug planted, so you can compare it with yours; the restored file is checkpoint 20's.
