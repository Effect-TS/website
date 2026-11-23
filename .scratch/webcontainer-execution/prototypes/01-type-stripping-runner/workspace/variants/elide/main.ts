// A type imported without `type`: tsc elides it, type stripping does not.
import { Name, shout } from "../legacy/util.js"
const n: Name = "elide"
console.log(shout(n))
