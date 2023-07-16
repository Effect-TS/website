import { Effect, Schedule } from "effect"
import * as Delay from "./Delay"

const schedule = Schedule.recurs(5).pipe(
  Schedule.andThen(Schedule.spaced("1 seconds"))
)

Effect.runPromise(Effect.repeat(Delay.log, schedule))
/*
delay: 4
delay: 8    < recurs
delay: 4
delay: 2
delay: 0
delay: 2
delay: 1005 < spaced
delay: 1007
delay: 1006
delay: 1007
delay: 1005
...
*/
