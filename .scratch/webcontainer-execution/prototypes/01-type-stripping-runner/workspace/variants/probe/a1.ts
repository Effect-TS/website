import * as Fs from "node:fs"
const here = (): string => new Error().stack!.split("\n")[2]!.trim()
console.log("a1 expect line 3:", here(), typeof Fs.existsSync)
