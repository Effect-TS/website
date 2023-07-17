import { Effect, Schedule } from "effect"
import * as Delay from "./Delay"

const schedule = Schedule.once

Effect.runPromise(Effect.repeat(Delay.log, schedule))
/*
delay: 3
delay: 8 < once
*/
