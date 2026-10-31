# Exercise 19: a minimum interval

`fixtures/rules/status-degraded.json` polls every 5 seconds. Change it to `"everySeconds": 0` and add it: the server accepts it, and the loop polls the receiver as fast as it can answer. A rule a learner mistypes should not be able to do that, and the place to refuse it is where every rule comes in: the `Rule` schema. The API decodes the payload with it, the CLI decodes the file with it, and the SQLite store decodes the stored JSON with it.

1. Write the test first, in `test/Rule.test.ts`. Decode an interval rule with `Schema.decodeUnknownExit(Rule)` at `everySeconds` 4 and at 5, and assert that the first is a failure and the second a success. Run `pnpm test test/Rule.test.ts`: the first assertion fails, because nothing checks the value yet.
2. In `src/Rule.ts`, `everySeconds` is a `Schema.Int`. Add the lower bound with `.check(Schema.isGreaterThanOrEqualTo(5))`, as lesson 14 did for `limit`.
3. Run the test again. It passes.

Check: `pnpm test` is green, and `pnpm cli rules add` with `everySeconds` set to 4 prints the decoding error, naming the field, before anything is sent to the server.

The changed files are in `solution/`. Checkpoint 19 already includes the check, and its test is one of the checkpoint 19 tests.
