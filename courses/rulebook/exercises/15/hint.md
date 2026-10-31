# Exercise 15: RuleNotFound as one line

Remove a rule that does not exist:

```sh
pnpm cli rules remove nope
```

You get `RuleNotFound` with a stack trace into the Schema internals. The server sent a 404, and the client turned it back into the same `RuleNotFound` the store fails with, because the endpoint declares that error. That is the useful part: on the CLI side it is an ordinary typed error, and you can handle it like any other. The stack trace is not useful to someone who typed an id wrong.

- Two commands send an id the server may not know: `rules remove` and `rules run`. Hover the handler of either and `RuleNotFound` is in the error channel.
- `Effect.fn` takes more arguments after the generator; each is applied to the effect it builds. Pass `Effect.catchTag("RuleNotFound", ...)` there and print `No rule with id <id>` with `Console.error`.
- Write the printing function once and use it in both commands.

Check: `pnpm cli rules remove nope` and `pnpm cli rules run nope --event fixtures/events/laptop.json` each print exactly one line. `pnpm checkpoint 15 cli rules remove nope` shows the state before the exercise.

The changed file is in `solution/`. From lesson 16 on, the checkpoints include this change.
