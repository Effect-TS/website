// Usage: TSRS_WASM=<module.wasm> node run.mjs <dir with node_modules/@tsrs/wasm and node_modules/effect> <project dir> [runs] [tsconfig.json]
// Loads the project's main.ts + tsconfig (default: <project>/tsconfig.json) and effect's .d.ts/package.json files
// into memory, runs tsc -p through the stock @tsrs/wasm host and prints the JSON diagnostics and timings.
import { readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"
import { createRequire } from "node:module"
const [exp, proj, runsArg, tsconfigArg] = process.argv.slice(2)
const require = createRequire(join(exp, "package.json"))
const { tsc } = await import(require.resolve("@tsrs/wasm"))
const files = {}
const walk = (dir, virt) => {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e),
      v = virt + "/" + e
    if (statSync(p).isDirectory()) {
      if (e !== "node_modules") walk(p, v)
    } else if (e.endsWith(".d.ts") || e === "package.json")
      files[v] = readFileSync(p, "utf8")
  }
}
walk(join(exp, "node_modules/effect"), "/p/node_modules/effect")
files["/p/tsconfig.json"] = readFileSync(
  tsconfigArg ?? join(proj, "tsconfig.json"),
  "utf8",
)
files["/p/main.ts"] = readFileSync(join(proj, "main.ts"), "utf8")
const runs = Number(runsArg ?? 1)
for (let i = 0; i < runs; i++) {
  files["/p/main.ts"] =
    readFileSync(join(proj, "main.ts"), "utf8") +
    (i ? `\nexport const v${i} = ${i}\n` : "")
  const t = performance.now()
  const r = await tsc(["-p", "/p/tsconfig.json"], {
    cwd: "/p",
    files,
    diagnostics: "json",
  })
  const ms = performance.now() - t
  console.log(
    `run ${i} ${ms.toFixed(0)}ms exit ${r.exitCode} mem ${(r.memoryBytes / 2 ** 20).toFixed(0)}MiB diags ${r.diagnostics?.length}`,
  )
  if (r.stderr) console.log("stderr:", r.stderr.slice(0, 2000))
  if (r.stdout) console.log("stdout:", r.stdout.slice(0, 2000))
  if (i === 0) console.log(JSON.stringify(r.diagnostics, null, 1))
}
