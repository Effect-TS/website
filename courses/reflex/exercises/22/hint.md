# Exercise 22: diagnose the mixed scenario

Goal: answer four questions about one event using only `runs list` and the viewer.

Run the mixed scenario from lesson 21 once more. Do not read the code or the fixture files while you answer. The point is to find out whether what you built tells you enough on its own.

1. Start the three processes and add the four rules:

   ```sh
   pnpm receiver --scenario mixed                         # terminal 1
   pnpm dev:server                                        # terminal 2, or: pnpm checkpoint 22 server
   pnpm cli rules add fixtures/rules/mixed/a-ok.json      # terminal 3, and b-ok, c-slow, d-fail
   pnpm cli events submit fixtures/events/laptop.json
   pnpm cli runs list
   ```

2. In the viewer, open the newest `reflex-server` trace that has an `Engine.handleEvent` span.

3. Write down your answers to these questions. For each one, name what you looked at: a span, a row, or a duration.
   1. Which operation was slowest? How long did it take, and why that long?
   2. Which operation failed, and with what?
   3. Which work finished, and did it wait for the slow one? How long did the whole request take?
   4. Did a timeout fire? Name two places that show it.

4. Compare your answers with `solution.md`, after you have written them down.

If you see four `succeeded` rows, the receiver answered `/slow` before the timeout. Check that `c-slow.json` asks for `ms=15000` and that `REFLEX_TIMEOUT` is not set in the server's shell.
