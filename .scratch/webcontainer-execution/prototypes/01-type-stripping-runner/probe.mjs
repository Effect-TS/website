// Second pass: line-offset model for stack traces, and hook/flag latency variants.
import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"
import Fs from "node:fs"
import Path from "node:path"

const here = Path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(Path.resolve(here, "../../../../package.json"))
const { chromium } = require("playwright")
function tree(dir) {
  const out = {}
  for (const e of Fs.readdirSync(dir, { withFileTypes: true })) {
    const p = Path.join(dir, e.name)
    out[e.name] = e.isDirectory()
      ? { directory: tree(p) }
      : { file: { contents: Fs.readFileSync(p, "utf8") } }
  }
  return out
}
const strip = (s) => s.replace(/\x1b\[[0-9;?]*[A-Za-z]/g, "")
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage()
await page.goto("http://localhost:5181/")
await page.waitForFunction(() => window.api?.ready)
const call = (fn, ...args) =>
  page.evaluate(([fn, args]) => window.api[fn](...args), [fn, args])
const results = []
async function run(label, cmd, args, opts = {}) {
  const r = await call("run", cmd, args, {
    cwd: "ws",
    timeoutMs: 30000,
    ...opts,
  })
  r.output = strip(r.output)
  results.push({ label, cmd: [cmd, ...args].join(" "), ...r })
  console.log(
    `\n=== ${label}  exit=${r.exitCode} first=${r.firstOutputMs?.toFixed(0)} marker=${r.markerMs?.toFixed(0)}`,
  )
  console.log(r.output.split("\n").slice(0, 8).join("\n"))
  return r
}
await call("boot")
await call(
  "mount",
  {
    ...tree(Path.join(here, "workspace")),
    ...tree(Path.join(here, "container")),
  },
  "ws",
)
await run("pnpm install", "pnpm", ["install"], { timeoutMs: 300000 })
const proxy = await call("start", "node", ["dev-tools-proxy.cjs"], {
  cwd: "ws",
})

const PRE = ["--import", "./runner-preload.mjs"]
for (const f of ["a0", "a1", "a3", "env"]) {
  await run(`probe ${f}`, "node", [...PRE, `variants/probe/${f}.ts`])
  await run(`probe ${f} +sourcemaps`, "node", [
    "--enable-source-maps",
    ...PRE,
    `variants/probe/${f}.ts`,
  ])
}

const mainSrc = Fs.readFileSync(
  Path.join(here, "workspace/src/main.ts"),
  "utf8",
)
const modes = {
  syncHook: [...PRE, "src/main.ts"],
  asyncHook: ["--import", "./register-async.mjs", "src/main.ts"],
  transformTypes: ["--experimental-transform-types", ...PRE, "src/main.ts"],
  sourceMaps: ["--enable-source-maps", ...PRE, "src/main.ts"],
}
const lat = {}
for (let i = 0; i < 4; i++) {
  for (const [mode, args] of Object.entries(modes)) {
    const marker = `edit-${mode}-${i}`
    const t0 = Date.now()
    await call(
      "writeFile",
      "ws/src/main.ts",
      mainSrc.replace("Welcome to the Effect v4 Playground!", marker),
    )
    const r = await call("run", "node", args, {
      cwd: "ws",
      marker,
      timeoutMs: 30000,
    })
    ;(lat[mode] ??= []).push(
      Math.round(Date.now() - t0 - (r.totalMs - r.markerMs)),
    )
  }
}
// what dominates: module loading of effect + platform-node
const imp = await run("import cost", "node", [
  "-e",
  "const t=Date.now(); Promise.all([import('effect/Effect'), import('@effect/platform-node/NodeRuntime'), import('@effect/platform-node/NodeSocket'), import('effect/devtools/DevTools'), import('effect/Logger'), import('effect/Layer')]).then(() => console.log('imports ms', Date.now()-t))",
])
const imp2 = await run("import cost effect/Effect only", "node", [
  "-e",
  "const t=Date.now(); import('effect/Effect').then(() => console.log('imports ms', Date.now()-t))",
])
const hello = await run("node hello", "node", ["-e", "console.log('hi')"])
console.log("\nLATENCY", JSON.stringify(lat))
results.push({ label: "latency2", lat })
Fs.writeFileSync(
  Path.join(here, "results-probe.json"),
  JSON.stringify(results, null, 1),
)
await call("teardown")
await browser.close()
