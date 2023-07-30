const task1 = new Promise<number>((resolve, reject) => {
  console.log("Executing task1...")
  setTimeout(() => {
    console.log("task1 done")
    resolve(1)
  }, 100)
})

const task2 = new Promise<number>((resolve, reject) => {
  console.log("Executing task2...")
  setTimeout(() => {
    console.log("task2 done")
    reject("Uh oh!")
  }, 200)
})

const task3 = new Promise<number>((resolve, reject) => {
  console.log("Executing task3...")
  setTimeout(() => {
    console.log("task3 done")
    resolve(3)
  }, 300)
})

export const program = Promise.all([task1, task2, task3])

program.then(console.log, console.error)
/*
Executing task1...
Executing task2...
Executing task3...
task1 done
task2 done
Uh oh!
task3 done
*/
