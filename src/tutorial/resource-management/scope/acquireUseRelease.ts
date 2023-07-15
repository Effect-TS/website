import { Effect } from "effect"
import { MyResource, acquire, release } from "./resource"

const use = (res: MyResource) =>
  Effect.sync(() => console.log(`content is ${res.contents}`))

const program: Effect.Effect<never, Error, void> = Effect.acquireUseRelease(
  acquire,
  use,
  release
)

Effect.runPromise(program)
/*
Resource acquired
content is lorem ipsum
Resource released
*/
