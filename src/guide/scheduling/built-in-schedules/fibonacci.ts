import { Effect, Schedule } from "effect"
import * as Delay from "./Delay"

const schedule = Schedule.fibonacci("10 millis")

Effect.runPromise(Effect.repeat(Delay.log, schedule))
/*
delay: 3
delay: 17 < fibonacci
delay: 11
delay: 23
delay: 32
delay: 52
delay: 84
delay: 132
delay: 212
delay: 342
delay: 556
delay: 892
...
*/
