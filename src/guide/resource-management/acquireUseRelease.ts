import { Effect, Console } from "effect"
import { MyResource, acquire, release } from "./resource"

const use = (res: MyResource) => Console.log(`content is ${res.contents}`)

// $ExpectType Effect<void, Error, never>
const program = Effect.acquireUseRelease(acquire, use, release)

Effect.runPromise(program)
/*
Output:
Resource acquired
content is lorem ipsum
Resource released
*/
