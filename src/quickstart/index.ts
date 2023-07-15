import { Effect } from "effect"

const program = Effect.sync(() => {
  console.log("Hello, World!")
})

Effect.runSync(program)
