import { Effect, Schedule } from "effect"
import * as Delay from "./Delay"

const schedule = Schedule.spaced("200 millis")

const action = Effect.delay(Delay.log, "100 millis")

Effect.runPromise(Effect.repeat(action, schedule))
/*
delay: 109
delay: 316 < spaced
delay: 302
delay: 306
delay: 306
...
*/
