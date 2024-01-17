import { Effect } from "effect"
import { effect } from "./fake"

Effect.runPromise(Effect.retry(effect, { times: 5 }))
/*
Output:
failure
failure
failure
success
*/
