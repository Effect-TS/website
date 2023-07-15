import { Effect } from "effect"

const program = Effect.log("Application started")

Effect.runSync(program)
/*
Output:
timestamp=2023-07-05T09:14:53.275Z level=INFO fiber=#0 message="Application started"
*/
