# Exercise 11: use the action's message

Make the `appendFile` action write the message from the rule file instead of building a line from the event.

Currently, `alertLine` builds each alert from the event, producing lines such as `expense 1200 over 500`. The rule files in `fixtures/rules/` already contain the message to write: `"message": "expense over 500"`.

1. In `src/Rule.ts`, add a `message: Schema.String` field to the `AppendFile` struct. `HttpPost` already has one, so copy its shape.
2. In the `case "appendFile"` branch in `src/run-once.ts`, write `rule.action.message` instead of the generated line. Hover over it in your editor to see that its type is now `string`, because the schema includes the field.
3. Delete `alertLine` and `words`, which are no longer used.
4. Copy a rule file, remove the message from the copy, and try running it. Read the error to find the missing key and its path.

Run `pnpm tsx src/run-once.ts fixtures/rules/expense.json fixtures/events/laptop.json` to check your change. It should append `expense over 500` to `alerts.log`. To compare with the state before the exercise, run `pnpm checkpoint 11`.

The changed files are in `solution/`. From checkpoint 12 on, the checkpoints include this change.
