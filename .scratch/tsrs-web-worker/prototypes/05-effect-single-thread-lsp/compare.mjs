// Diffs two feature dumps (run-node.mjs features --out ...): node compare.mjs native.json wasm.json [--verbose]
// Prints one line per probe (feature / sub-probe): "same" or the differing paths with both values.
import { readFileSync } from "node:fs"

const [a, b, ...rest] = process.argv.slice(2)
// A dump is a run-node.mjs features file ({ compared }) or a browser result file ({ result: { compared } }).
const load = (f) => {
  const j = JSON.parse(readFileSync(f, "utf8"))
  return j.compared ?? j.result.compared
}
const A = load(a)
const B = load(b)
const verbose = rest.includes("--verbose")

function diffs(x, y, path = "") {
  if (JSON.stringify(x) === JSON.stringify(y)) return []
  if (
    x &&
    y &&
    typeof x === "object" &&
    typeof y === "object" &&
    Array.isArray(x) === Array.isArray(y)
  ) {
    const keys = [...new Set([...Object.keys(x), ...Object.keys(y)])]
    return keys.flatMap((k) => diffs(x[k], y[k], `${path}/${k}`))
  }
  return [{ path, native: x, wasm: y }]
}

let same = 0,
  differ = 0
for (const top of Object.keys({ ...A, ...B })) {
  const subs =
    A[top] && typeof A[top] === "object" && !Array.isArray(A[top])
      ? Object.keys({ ...A[top], ...B[top] })
      : [null]
  for (const sub of subs) {
    const x = sub === null ? A[top] : A[top]?.[sub]
    const y = sub === null ? B[top] : B[top]?.[sub]
    const d = diffs(x, y)
    const name = sub === null ? top : `${top} / ${sub}`
    if (d.length === 0) {
      same++
      if (verbose) console.log(`same   ${name}`)
      continue
    }
    differ++
    console.log(`DIFF   ${name}`)
    for (const { path, native, wasm } of d.slice(0, 12))
      console.log(
        `         ${path || "(value)"}\n           native: ${JSON.stringify(native)?.slice(0, 400)}\n           wasm:   ${JSON.stringify(wasm)?.slice(0, 400)}`,
      )
    if (d.length > 12) console.log(`         ... ${d.length - 12} more`)
  }
}
console.log(`\n${same} probes identical, ${differ} differ`)
