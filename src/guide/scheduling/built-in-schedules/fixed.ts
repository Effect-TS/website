import { Effect, Schedule } from "effect"
import * as Delay from "./Delay"

const schedule = Schedule.fixed("200 millis")

const action = Effect.delay(Delay.log, "100 millis")

Effect.runPromise(Effect.repeat(action, schedule))
/*
Output:
delay: 109
delay: 316 < fixed
delay: 202
delay: 202
delay: 203
...
*/
