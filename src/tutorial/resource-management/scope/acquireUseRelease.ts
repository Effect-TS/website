import { Effect } from "effect"
import { MyResource, acquire, release } from "./resource"

const use = (res: MyResource) =>
  Effect.sync(() => console.log(`content is ${res.contents}`))

// $ExpectType Effect<never, Error, void>
const program = Effect.acquireUseRelease(acquire, use, release)

Effect.runPromise(program)
/*
Resource acquired
content is lorem ipsum
Resource released
*/
