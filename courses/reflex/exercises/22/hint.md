# Exercise 22: diagnose the mixed scenario

Use only `runs list` and the viewer to answer four questions about one event.

Run the mixed scenario from lesson 21 again, and don't look at the code or the fixture files while you answer. The point is to find out whether the run history and the traces tell you enough on their own.

Start with an empty database, so the event matches only these four rules: stop the server and delete `reflex.db` before restarting it below. Keep the trace viewer running.

1. Start the receiver and server in separate terminals, then add the four rules with the CLI:

   ```sh
   pnpm receiver --scenario mixed                         # terminal 1
   pnpm dev:server                                        # terminal 2, or: pnpm checkpoint 22 server
   pnpm cli rules add fixtures/rules/mixed/a-ok.json      # terminal 3, and b-ok, c-slow, d-fail
   pnpm cli events submit fixtures/events/laptop.json
   pnpm cli runs list
   ```

2. In the viewer, open the newest `reflex-server` trace that has an `Engine.handleEvent` span.

3. Write down your answers to the following questions. Support each answer with the span, row, or duration you used.
   1. Which operation was slowest? How long did it take, and why that long?
   2. Which operation failed, and what was the error?
   3. Which work finished? Did it wait for the slow operation? How long did the whole request take?
   4. Did a timeout occur? Name two places that show it.

4. Once you have written down your answers, compare them with `solution.md`.

If you see four `succeeded` rows, the receiver answered `/slow` before the timeout. Check that `c-slow.json` asks for `ms=15000` and that `REFLEX_TIMEOUT` is not set in the server's shell.
