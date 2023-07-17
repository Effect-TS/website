import { Effect } from "effect"

let start = new Date().getTime()

export const log = Effect.sync(() => {
  const now = new Date().getTime()
  console.log(`delay: ${now - start}`)
  start = now
})
