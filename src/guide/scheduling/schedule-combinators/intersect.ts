import { Effect, Schedule } from "effect"
import * as Delay from "./Delay"

const schedule = Schedule.intersect(
  Schedule.exponential("10 millis"),
  Schedule.recurs(5)
)

Effect.runPromise(Effect.repeat(Delay.log, schedule))
/*
delay: 4
delay: 18  < recurs
delay: 22
delay: 45
delay: 84
delay: 166
*/
