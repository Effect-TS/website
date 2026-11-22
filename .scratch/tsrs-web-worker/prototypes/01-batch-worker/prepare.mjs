// Copies the stock @tsrs/wasm runtime into ../../artifacts/tsrs/ and builds the Effect .d.ts packs:
//   artifacts/effect-pack.json  {path: text}                       (simple, what bench.mjs used)
//   artifacts/effect-pack.bin   u32 headerLen | header JSON {path: [offset, length]} | UTF-8 blob
// plus .gz / .br siblings, and artifacts/sizes.json with raw/gzip/brotli sizes.
// Usage: node prepare.mjs [<dir containing node_modules/@tsrs/wasm and node_modules/effect>]
import {
  copyFileSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { brotliCompressSync, constants, gzipSync } from "node:zlib"

const here = dirname(fileURLToPath(import.meta.url))
const artifacts = resolve(here, "../../artifacts")
const exp = resolve(
  process.argv[2] ??
    process.env.TSRS_EXP ??
    "/tmp/claude-1000/-home-maxwellbrown--t3-worktrees-website-t3-ea6468bd-bd0da0eca35fa438/15abd0d2-80d4-4350-954f-da9d9d9fa38c/scratchpad/exp",
)
const tsrsDir = join(exp, "node_modules/@tsrs/wasm")
const effectDir = join(exp, "node_modules/effect")

mkdirSync(join(artifacts, "tsrs"), { recursive: true })
for (const f of ["tsrs.wasm", "core.js", "browser.js", "package.json"])
  copyFileSync(join(tsrsDir, f), join(artifacts, "tsrs", f))

const files = {}
const walk = (dir, virt) => {
  for (const e of readdirSync(dir).sort()) {
    const p = join(dir, e),
      v = virt + "/" + e
    if (statSync(p).isDirectory()) {
      if (e !== "node_modules") walk(p, v)
    } else if (e.endsWith(".d.ts") || e === "package.json")
      files[v] = readFileSync(p, "utf8")
  }
}
walk(effectDir, "/p/node_modules/effect")

const json = Buffer.from(JSON.stringify(files))
const enc = new TextEncoder()
const header = {}
const chunks = []
let off = 0
for (const [path, text] of Object.entries(files)) {
  const b = enc.encode(text)
  header[path] = [off, b.length]
  chunks.push(b)
  off += b.length
}
const h = enc.encode(JSON.stringify(header))
const len = Buffer.alloc(4)
len.writeUInt32LE(h.length)
const bin = Buffer.concat([len, h, ...chunks])

const sizes = {}
const record = (name, buf) => {
  const gz = gzipSync(buf, { level: 9 })
  const br = brotliCompressSync(buf, {
    params: {
      [constants.BROTLI_PARAM_QUALITY]: 11,
      [constants.BROTLI_PARAM_SIZE_HINT]: buf.length,
    },
  })
  writeFileSync(join(artifacts, name), buf)
  writeFileSync(join(artifacts, name + ".gz"), gz)
  writeFileSync(join(artifacts, name + ".br"), br)
  sizes[name] = { raw: buf.length, gzip: gz.length, brotli: br.length }
}
record("effect-pack.json", json)
record("effect-pack.bin", bin)
const wasm = readFileSync(join(tsrsDir, "tsrs.wasm"))
const wgz = gzipSync(wasm, { level: 9 })
const wbr = brotliCompressSync(wasm, {
  params: {
    [constants.BROTLI_PARAM_QUALITY]: 11,
    [constants.BROTLI_PARAM_SIZE_HINT]: wasm.length,
  },
})
writeFileSync(join(artifacts, "tsrs", "tsrs.wasm.gz"), wgz)
writeFileSync(join(artifacts, "tsrs", "tsrs.wasm.br"), wbr)
sizes["tsrs.wasm"] = { raw: wasm.length, gzip: wgz.length, brotli: wbr.length }
sizes.effectFiles = Object.keys(files).length
sizes.versions = {
  tsrs: JSON.parse(readFileSync(join(tsrsDir, "package.json"), "utf8")).version,
  effect: JSON.parse(readFileSync(join(effectDir, "package.json"), "utf8"))
    .version,
}
writeFileSync(join(artifacts, "sizes.json"), JSON.stringify(sizes, null, 2))
console.log(JSON.stringify(sizes, null, 2))
