import { Effect, Schedule } from "effect"
import * as Delay from "./Delay"

const schedule = Schedule.whileOutput(Schedule.recurs(5), (n) => n <= 2)

Effect.runPromise(Effect.repeat(Delay.log, schedule))
/*
delay: 2
delay: 11 < recurs
delay: 1
delay: 1
(end)     < whileOutput
 */
