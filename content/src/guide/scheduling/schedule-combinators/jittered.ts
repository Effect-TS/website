import { Effect, Schedule } from "effect"
import * as Delay from "./Delay"

const schedule = Schedule.jittered(Schedule.exponential("10 millis"))

Effect.runPromise(Effect.repeat(Delay.log, schedule))
/*
Output:
delay: 3
delay: 18
delay: 24
delay: 48
delay: 92
delay: 184
delay: 351
delay: 620
delay: 1129
delay: 2576
...
*/
