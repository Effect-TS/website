import { Effect, Schedule } from "effect"
import * as Delay from "./Delay"

const schedule = Schedule.spaced("1 seconds").pipe(
  Schedule.modifyDelay((_) => "100 millis")
)

Effect.runPromise(Effect.repeat(Delay.log, schedule))
/*
delay: 4
delay: 110 < modifyDelay
delay: 103
delay: 103
delay: 106
...
 */
