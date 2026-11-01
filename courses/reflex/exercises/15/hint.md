# Exercise 15: print RuleNotFound on one line

Make the CLI print one line and exit with a non-zero code when a command uses an unknown rule id.

Try it first:

```sh
pnpm cli rules remove nope
```

The command prints `RuleNotFound` with a stack trace into the Schema internals. The server answered 404, and because the endpoint declares that error, the client decoded it back into the same `RuleNotFound` the store produced. In the CLI you can handle it like any other typed error and replace the stack trace with a message that helps someone who mistyped an id.

1. Find the two commands that accept a rule id: `rules remove` and `rules run`. Hover over either handler in your editor to find `RuleNotFound` in its error type.
2. Use `Effect.fn` to write a shared error handler. It should print `No rule with id <id>` with `Console.error`, then fail with `new ExitCode({ code: 1 })` from `tools/entrypoint.ts`. `runMain` exits with that code and prints nothing more, whereas failing with `RuleNotFound` again would print the error a second time.
3. `Effect.fn` accepts additional arguments after the generator and applies each one to the effect it builds. In both commands, pass `Effect.catchTag("RuleNotFound", ...)` there, using your shared handler.

Try `pnpm cli rules remove nope` and `pnpm cli rules run nope --event fixtures/events/laptop.json`. Each prints exactly one line and exits with code 1, which `echo $?` confirms. To compare with the state before the exercise, run `pnpm checkpoint 15 cli rules remove nope`.

The changed file is in `solution/`. From checkpoint 16 on, the checkpoints include this change.
