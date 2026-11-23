import * as Effect from "effect/Effect"
import { greet } from "./lib/greet.js"
import type { Name } from "./util.js"

const name: Name = "legacy"
Effect.runSync(Effect.log(greet(name)))
