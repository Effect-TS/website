import { register } from "node:module"
process.title ??= "node"
register("./resolve-async-hooks.mjs", import.meta.url)
