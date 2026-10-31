# Exercise 11: a message on the action

Every alert line reads like "expense 1200 over 500" because `alertLine` builds it from the event. The rule files in `fixtures/rules/` already carry the words they want written: `"message": "expense over 500"`. Make the action say what the rule says.

- The shape of an action lives in one place, the `AppendFile` struct in `src/Rule.ts`. Add a `message` field there; `HttpPost` already has one.
- Once the field is in the schema, `rule.action.message` is a `string` inside the `case "appendFile"` branch of `src/run-once.ts`. Hover it.
- `alertLine` has no caller left. Delete it, and `words` with it.
- Feed a rule file with the message removed and read the error: it names the missing key and its path.

Check: `pnpm tsx src/run-once.ts fixtures/rules/expense.json fixtures/events/laptop.json` appends "expense over 500" to `alerts.log`. `pnpm checkpoint 11` runs the lesson's state before the exercise.

The changed files are in `solution/`. From lesson 12 on, the checkpoints include this change.
