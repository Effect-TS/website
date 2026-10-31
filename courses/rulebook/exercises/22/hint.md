# Exercise 22: diagnose the mixed scenario

Run the mixed scenario from lesson 21 once more, then answer four questions using only `runs list` and the viewer. Don't read the code or the fixture files while you answer. The point is to find out whether what you built tells you enough on its own.

```sh
pnpm receiver --scenario mixed                         # terminal 1
pnpm dev:server                                        # terminal 2, or: pnpm checkpoint 22 server
pnpm cli rules add fixtures/rules/mixed/a-ok.json      # terminal 3, and b-ok, c-slow, d-fail
pnpm cli events submit fixtures/events/laptop.json
pnpm cli runs list
```

In the viewer, open the newest `rulebook-server` trace that has an `Engine.handleEvent` span.

1. Which operation was slowest? How long did it take, and why that long?
2. Which operation failed, and with what?
3. Which work finished, and did it wait for the slow one? How long did the whole request take?
4. Did a timeout fire? Name two places that show it.

Write your answers down before you open `solution.md`.

If you see four `succeeded` rows, the receiver answered `/slow` before the timeout. Check that `c-slow.json` asks for `ms=15000` and that `RULEBOOK_TIMEOUT` isn't set in the server's shell.
