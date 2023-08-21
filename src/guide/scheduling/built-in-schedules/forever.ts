import { Effect, Schedule } from "effect"
import * as Delay from "./Delay"

const schedule = Schedule.forever

Effect.runPromise(Effect.repeat(Delay.log, schedule))
/*
Output:
delay: 3
delay: 7 < forever
delay: 5
delay: 1
delay: 1
delay: 1
delay: 1
delay: 1
...
*/
