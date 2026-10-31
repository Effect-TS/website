# Exercise 15: RuleNotFound as one line

Goal: make the CLI print one line and exit non-zero when a command names a rule the server does not know.

Try it first:

```sh
pnpm cli rules remove nope
```

You get `RuleNotFound` with a stack trace into the Schema internals. The server sent a 404. Because the endpoint declares that error, the client turned it back into the same `RuleNotFound` the store fails with. On the CLI side it is an ordinary typed error, so you can handle it like any other. The stack trace is no help to someone who typed an id wrong.

1. Find the two commands that send an id the server may not know: `rules remove` and `rules run`. Hover the handler of either one. `RuleNotFound` is in its error type.
2. Write one handler with `Effect.fn` that prints `No rule with id <id>` with `Console.error`, then fails with `new ExitCode({ code: 1 })` from `tools/entrypoint.ts`. `runMain` exits with that code and prints nothing more. Failing with the `RuleNotFound` again would print it a second time.
3. `Effect.fn` takes more arguments after the generator and applies each one to the effect it builds. Pass `Effect.catchTag("RuleNotFound", ...)` there, with your handler, in both commands.

Check: `pnpm cli rules remove nope` and `pnpm cli rules run nope --event fixtures/events/laptop.json` each print exactly one line and exit 1 (`echo $?`). To compare with the state before the exercise, run `pnpm checkpoint 15 cli rules remove nope`.

The changed file is in `solution/`. From checkpoint 16 on, the checkpoints include this change.
