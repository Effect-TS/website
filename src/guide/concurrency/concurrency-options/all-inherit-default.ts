import { Effect, Duration } from "effect"

const makeTask = (n: number, delay: Duration.DurationInput) =>
  Effect.promise(
    () =>
      new Promise<void>((resolve) => {
        console.log(`start task${n}`)
        setTimeout(() => {
          console.log(`task${n} done`)
          resolve()
        }, Duration.toMillis(delay))
      })
  )

const task1 = makeTask(1, "200 millis")
const task2 = makeTask(2, "100 millis")
const task3 = makeTask(3, "210 millis")
const task4 = makeTask(4, "110 millis")
const task5 = makeTask(5, "150 millis")

const inherit = Effect.all([task1, task2, task3, task4, task5], {
  concurrency: "inherit",
})

Effect.runPromise(inherit)
/*
start task1
start task2
start task3
start task4
start task5
task2 done
task4 done
task5 done
task1 done
task3 done
*/
