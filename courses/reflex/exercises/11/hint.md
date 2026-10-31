# Exercise 11: a message on the action

Goal: make the `appendFile` action write the message the rule file gives it, instead of a line built from the event.

Today every alert line reads like `expense 1200 over 500`, because `alertLine` builds it from the event. The rule files in `fixtures/rules/` already say what they want written: `"message": "expense over 500"`.

1. In `src/Rule.ts`, add a `message: Schema.String` field to the `AppendFile` struct. `HttpPost` already has one, so copy its shape.
2. In `src/run-once.ts`, in the `case "appendFile"` branch, write `rule.action.message` instead of the built line. Hover it: it is a `string` now that the schema has the field.
3. Delete `alertLine`, which has no caller left, and `words` with it.
4. Feed in a rule file with the message removed and read the error. It names the missing key and its path.

Check: `pnpm tsx src/run-once.ts fixtures/rules/expense.json fixtures/events/laptop.json` appends `expense over 500` to `alerts.log`. To compare with the state before the exercise, run `pnpm checkpoint 11`.

The changed files are in `solution/`. From checkpoint 12 on, the checkpoints include this change.
