// Runs INSIDE the Container (CommonJS, plain Node APIs, no dependencies). The
// host ships it as a string (`collect-types.cjs?raw`), writes it to the host
// scripts directory and runs it after each install. See spike 02.
//
//   node collect-types.cjs <node_modules dir> <out file> [--skip-ts-libs]
//
// Flattens pnpm's layout into one directory per package name and writes a
// TSPK types pack (packages/tsrs-lsp-wasm/src/TypesPack.ts) holding every
// package.json and *.d.{ts,mts,cts}, keyed `<name>/<path in package>`.
//
// A name's directory is the realpath of
//   1. node_modules/<name> (pnpm's link for a direct dependency), else
//   2. node_modules/.pnpm/node_modules/<name> (pnpm's hidden hoist, where pnpm
//      has already picked one version per name for the whole graph).
// Nested node_modules directories inside a package are skipped. Store
// packages that neither link reaches (other versions of a name) are dropped.
// With --skip-ts-libs, typescript/lib/lib.*.d.ts are left out: tsrs bundles
// its own lib files.
//
// Prints one line of JSON: { files, bytes, packages, dropped, ms }.
"use strict"
const fs = require("fs")
const path = require("path")

const t0 = Date.now()
const root = path.resolve(process.argv[2] || "node_modules")
const outFile = process.argv[3] || "types.pack"
const skipTsLibs = process.argv.includes("--skip-ts-libs")
const DECLARATION = /\.d\.(ts|mts|cts)$/
const TS_LIB = /^lib\/lib\..*\.d\.ts$/

const readdir = (dir) => {
  try {
    return fs.readdirSync(dir, { withFileTypes: true })
  } catch {
    return []
  }
}

/** Package names directly below `dir`, scopes expanded. */
const namesIn = (dir) => {
  const names = []
  for (const entry of readdir(dir)) {
    if (entry.name.startsWith(".")) continue
    if (entry.name.startsWith("@")) {
      for (const scoped of readdir(path.join(dir, entry.name))) {
        names.push(`${entry.name}/${scoped.name}`)
      }
    } else {
      names.push(entry.name)
    }
  }
  return names
}

const chosen = new Map() // name -> real directory
const consider = (name, link) => {
  if (chosen.has(name)) return
  try {
    const real = fs.realpathSync(link)
    if (fs.existsSync(path.join(real, "package.json"))) chosen.set(name, real)
  } catch {
    // A dangling link: skip it.
  }
}
for (const name of namesIn(root)) consider(name, path.join(root, name))
const hoisted = path.join(root, ".pnpm", "node_modules")
for (const name of namesIn(hoisted)) consider(name, path.join(hoisted, name))

let dropped = 0
const reached = new Set(chosen.values())
const storeDir = path.join(root, ".pnpm")
for (const entry of readdir(storeDir)) {
  if (entry.name === "node_modules" || entry.name.startsWith(".")) continue
  const dir = path.join(storeDir, entry.name, "node_modules")
  for (const name of namesIn(dir)) {
    const p = path.join(dir, name)
    try {
      if (fs.lstatSync(p).isSymbolicLink()) continue
    } catch {
      continue
    }
    if (!reached.has(p)) dropped++
  }
}

const files = []
const chunks = []
const packages = []
let offset = 0
const sorted = [...chosen].sort((a, b) => (a[0] < b[0] ? -1 : 1))
for (const [name, dir] of sorted) {
  let version = "0.0.0"
  try {
    const manifest = JSON.parse(
      fs.readFileSync(path.join(dir, "package.json"), "utf8"),
    )
    if (typeof manifest.version === "string") version = manifest.version
  } catch {
    // Keep the placeholder version.
  }
  packages.push({ name, version })
  const walk = (current, rel) => {
    const entries = readdir(current).sort((a, b) => (a.name < b.name ? -1 : 1))
    for (const entry of entries) {
      if (entry.name === "node_modules") continue
      const full = path.join(current, entry.name)
      const relPath = rel === "" ? entry.name : `${rel}/${entry.name}`
      if (entry.isDirectory()) {
        walk(full, relPath)
      } else if (
        entry.isFile() &&
        (entry.name === "package.json" || DECLARATION.test(entry.name))
      ) {
        if (skipTsLibs && name === "typescript" && TS_LIB.test(relPath)) {
          continue
        }
        const data = fs.readFileSync(full)
        files.push([`${name}/${relPath}`, offset, data.length])
        chunks.push(data)
        offset += data.length
      }
    }
  }
  walk(dir, "")
}

const header = Buffer.from(JSON.stringify({ packages, files }))
const prefix = Buffer.alloc(12)
prefix.write("TSPK", 0, "latin1")
prefix.writeUInt32LE(1, 4)
prefix.writeUInt32LE(header.length, 8)
fs.mkdirSync(path.dirname(path.resolve(outFile)), { recursive: true })
fs.writeFileSync(outFile, Buffer.concat([prefix, header, ...chunks]))
console.log(
  JSON.stringify({
    files: files.length,
    bytes: offset,
    packages: packages.length,
    dropped,
    ms: Date.now() - t0,
  }),
)
