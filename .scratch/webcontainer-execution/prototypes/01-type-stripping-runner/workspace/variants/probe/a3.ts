import * as Fs from "node:fs"
import { join, dirname } from "node:path"
import type { Stats } from "node:fs"
const here = (): string => new Error().stack!.split("\n")[2]!.trim()
console.log(
  "a3 expect line 8:",
  here(),
  typeof Fs.existsSync,
  typeof join,
  typeof dirname,
)
const s: Stats | undefined = undefined
console.log("a3 expect line 10:", here(), s)
