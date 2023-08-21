import { Effect } from "effect"
import { effect } from "./fake"

Effect.runPromise(Effect.retryN(effect, 5))
/*
Output:
failure
failure
failure
success
*/
