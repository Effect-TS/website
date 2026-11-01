# Exercise 19: a minimum interval

Reject interval rules whose `everySeconds` is below 5 by adding a check to the shared `Rule` schema.

Set `"everySeconds": 0` in `fixtures/rules/status-degraded.json` and add the rule. The server accepts it, and the loop polls the receiver as fast as it can answer. A minimum interval stops a mistyped rule from doing this.

Remove that rule and restore the fixture's interval before you change the schema, otherwise the stored rule fails validation the next time the server reads it.

The API decodes payloads with the `Rule` schema, the CLI decodes files with it, and the SQLite store decodes stored JSON with it, so a check added there applies in all three places.

1. Write the test first in `test/Rule.test.ts`. Use `Schema.decodeUnknownExit(Rule)` to decode an interval rule with `everySeconds` set to 4, then another with it set to 5. Assert that the first fails and the second succeeds. Run `pnpm test test/Rule.test.ts` and watch the first assertion fail, because there is no lower bound yet.
2. In `src/Rule.ts`, `everySeconds` is a `Schema.Int`. Add `.check(Schema.isGreaterThanOrEqualTo(5))`, as you did for `limit` in exercise 14.
3. Run the test again. It passes.

Run `pnpm test` to check the full suite. Then try `pnpm cli rules add` with `everySeconds` set to 4. It prints a decoding error naming the field and sends nothing to the server.

The changed files are in `solution/`. Checkpoint 19 already includes both the check and its test.
