# Exercise 19: a minimum interval

Reject interval rules whose `everySeconds` is below 5 by adding a check to the shared `Rule` schema.

Set `"everySeconds": 0` in `fixtures/rules/status-degraded.json` and add the rule. The server accepts it, and the loop polls the receiver as fast as it can answer. The minimum interval check will prevent a mistyped rule from causing this behavior.

Remove this test rule and restore the fixture's interval before changing the schema. Otherwise, the stored rule would fail validation when the server next reads it.

The API uses the `Rule` schema to decode payloads, the CLI uses it to decode files, and the SQLite store uses it to decode stored JSON. A check in this schema therefore applies in all three places.

1. Write the test first in `test/Rule.test.ts`. Use `Schema.decodeUnknownExit(Rule)` to decode an interval rule with `everySeconds` set to 4, then another with it set to 5. Assert that the first fails and the second succeeds. Run `pnpm test test/Rule.test.ts` and confirm that the first assertion fails because there is no lower-bound check yet.
2. In `src/Rule.ts`, `everySeconds` is a `Schema.Int`. Add `.check(Schema.isGreaterThanOrEqualTo(5))` to set the lower bound, following the approach you used for `limit` in exercise 14.
3. Run the test again and confirm that it passes.

Run `pnpm test` to check the full suite. Then try `pnpm cli rules add` with `everySeconds` set to 4. It should print a decoding error that names the field, without sending anything to the server.

The changed files are in `solution/`. Checkpoint 19 already includes both the check and its test.
