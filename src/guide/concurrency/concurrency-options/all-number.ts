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

const number = Effect.all([task1, task2, task3, task4, task5], {
  concurrency: 2,
})

Effect.runPromise(number)
/*
start task1
start task2 <-- active tasks: task1, task2
task2 done
start task3 <-- active tasks: task1, task3
task1 done
start task4 <-- active tasks: task3, task4
task4 done
start task5 <-- active tasks: task3, task5
task3 done
task5 done
*/
