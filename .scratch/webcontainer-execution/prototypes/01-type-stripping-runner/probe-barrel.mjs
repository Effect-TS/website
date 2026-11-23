// Third pass: cost of the @effect/platform-node barrel import used by the v4 DevTools.ts.
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

for (let i = 0; i < 3; i++) {
  await run("barrel @effect/platform-node", "node", [
    "-e",
    "const t=Date.now(); import('@effect/platform-node').then(() => console.log('imports ms', Date.now()-t))",
  ])
  await run("subpath NodeSocket+NodeRuntime", "node", [
    "-e",
    "const t=Date.now(); Promise.all([import('@effect/platform-node/NodeSocket'), import('@effect/platform-node/NodeRuntime')]).then(() => console.log('imports ms', Date.now()-t))",
  ])
  await run("v4 template as-is", "node", [
    "--import",
    "./runner-preload.mjs",
    "src/main.ts",
  ])
  await run("v4 template w/o DevTools barrel", "node", [
    "--import",
    "./runner-preload.mjs",
    "variants/subpath/main.ts",
  ])
}
Fs.writeFileSync(
  Path.join(here, "results-barrel.json"),
  JSON.stringify(results, null, 1),
)
await call("teardown")
await browser.close()
