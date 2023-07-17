import { Effect, Schedule } from "effect"
import * as Delay from "./Delay"

const schedule = Schedule.exponential("10 millis")

Effect.runPromise(Effect.repeat(Delay.log, schedule))
/*
delay: 4
delay: 17 < exponential
delay: 21
delay: 40
delay: 85
delay: 168
delay: 324
delay: 644
delay: 1287
...
*/
