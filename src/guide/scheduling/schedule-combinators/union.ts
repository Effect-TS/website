import { Effect, Schedule } from "effect"
import * as Delay from "./Delay"

const schedule = Schedule.union(
  Schedule.exponential("100 millis"),
  Schedule.spaced("1 seconds")
)

Effect.runPromise(Effect.repeat(Delay.log, schedule))
/*
delay: 3
delay: 115  < exponential
delay: 202
delay: 404
delay: 802
delay: 1002 < spaced
delay: 1006
delay: 1006
delay: 1006
delay: 1006
...
*/
