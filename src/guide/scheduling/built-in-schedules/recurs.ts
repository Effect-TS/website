import { Effect, Schedule } from "effect"
import * as Delay from "./Delay"

const schedule = Schedule.recurs(5)

Effect.runPromise(Effect.repeat(Delay.log, schedule))
/*
Output:
delay: 5
delay: 8 < recurs
delay: 6
delay: 2
delay: 1
delay: 1
*/
