# Exercise 11: a message on the action

Every alert line reads like "expense 1200 over 500", because `alertLine` builds it from the event. But the rule files in `fixtures/rules/` already say what they want written: `"message": "expense over 500"`. Your job is to make the action write what the rule says.

- The shape of an action lives in one place, the `AppendFile` struct in `src/Rule.ts`. Add a `message` field there. `HttpPost` already has one, so you can follow its lead.
- Once the field is in the schema, `rule.action.message` is a `string` inside the `case "appendFile"` branch of `src/run-once.ts`. Hover it to see.
- After that, `alertLine` has no caller left. Delete it, and `words` with it.
- Finally, feed in a rule file with the message removed and read the error. Notice that it names the missing key and its path.

Check: `pnpm tsx src/run-once.ts fixtures/rules/expense.json fixtures/events/laptop.json` appends "expense over 500" to `alerts.log`. If you want to compare, `pnpm checkpoint 11` runs the lesson's state before the exercise.

The changed files are in `solution/`. From lesson 12 on, the checkpoints include this change.
