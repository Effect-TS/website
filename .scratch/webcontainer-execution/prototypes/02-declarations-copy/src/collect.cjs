// Runs INSIDE the WebContainer (CommonJS, plain Node APIs).
//
//   node collect.cjs <node_modules dir> <out file> [--skip-ts-libs]
//
// Flattens the pnpm layout into one package directory per name and writes a
// TSPK types pack (packages/tsrs-lsp-wasm/src/TypesPack.ts format) holding
// every package.json and *.d.{ts,mts,cts}, keyed `<name>/<path in package>`.
//
// Flattening rule: a name's directory is the realpath of
//   1. node_modules/<name>                (direct dependency symlink), else
//   2. node_modules/.pnpm/node_modules/<name>  (pnpm's hidden hoist: pnpm picks
//      one version per name for every package in the graph).
// Store packages that neither link reaches (other versions of a name) are
// dropped and reported in `dropped`.
const fs = require("fs")
const path = require("path")

const t0 = Date.now()
const root = path.resolve(process.argv[2] || "node_modules")
const outFile = process.argv[3] || ".types.pack"
const skipTsLibs = process.argv.includes("--skip-ts-libs")
const DECL = /\.d\.(ts|mts|cts)$/

const chosen = new Map() // name -> real dir
const consider = (name, link) => {
  if (chosen.has(name)) return
  try {
    const real = fs.realpathSync(link)
    if (fs.existsSync(path.join(real, "package.json"))) chosen.set(name, real)
  } catch {}
}
const addFrom = (dir) => {
  let entries
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
  } catch {
    return
  }
  for (const e of entries) {
    if (e.name.startsWith(".")) continue
    if (e.name.startsWith("@")) {
      for (const s of fs.readdirSync(path.join(dir, e.name)))
        consider(`${e.name}/${s}`, path.join(dir, e.name, s))
    } else consider(e.name, path.join(dir, e.name))
  }
}
addFrom(root)
addFrom(path.join(root, ".pnpm", "node_modules"))

// Report store packages no link reaches.
const reached = new Set(chosen.values())
const dropped = []
const storeDir = path.join(root, ".pnpm")
for (const id of fs.readdirSync(storeDir)) {
  if (id === "node_modules" || id.startsWith(".")) continue
  const nm = path.join(storeDir, id, "node_modules")
  let entries
  try {
    entries = fs.readdirSync(nm, { withFileTypes: true })
  } catch {
    continue
  }
  for (const e of entries) {
    const names = e.name.startsWith("@")
      ? fs.readdirSync(path.join(nm, e.name)).map((s) => `${e.name}/${s}`)
      : [e.name]
    for (const name of names) {
      const p = path.join(nm, name)
      if (fs.lstatSync(p).isSymbolicLink()) continue
      if (!reached.has(p)) dropped.push(`${id} -> ${name}`)
    }
  }
}

const files = []
const chunks = []
const perPackage = {}
let offset = 0
const packages = []
for (const [name, dir] of [...chosen].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
  const pkg = JSON.parse(
    fs.readFileSync(path.join(dir, "package.json"), "utf8"),
  )
  packages.push({ name, version: pkg.version || "0.0.0" })
  let pkgBytes = 0
  let pkgFiles = 0
  const walk = (d, rel) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.name === "node_modules") continue
      const full = path.join(d, e.name)
      const r = rel ? `${rel}/${e.name}` : e.name
      if (e.isDirectory()) walk(full, r)
      else if (e.isFile() && (e.name === "package.json" || DECL.test(e.name))) {
        if (
          skipTsLibs &&
          name === "typescript" &&
          /^lib\/lib\..*\.d\.ts$/.test(r)
        )
          continue
        const data = fs.readFileSync(full)
        files.push([`${name}/${r}`, offset, data.length])
        chunks.push(data)
        offset += data.length
        pkgBytes += data.length
        pkgFiles++
      }
    }
  }
  walk(dir, "")
  perPackage[name] = { version: pkg.version, files: pkgFiles, bytes: pkgBytes }
}
const header = Buffer.from(JSON.stringify({ packages, files }))
const prefix = Buffer.alloc(12)
prefix.write("TSPK", 0, "latin1")
prefix.writeUInt32LE(1, 4)
prefix.writeUInt32LE(header.length, 8)
fs.writeFileSync(outFile, Buffer.concat([prefix, header, ...chunks]))
const stats = {
  files: files.length,
  bytes: offset,
  packBytes: 12 + header.length + offset,
  packages: chosen.size,
  dropped,
  perPackage,
  ms: Date.now() - t0,
}
fs.writeFileSync(outFile + ".json", JSON.stringify(stats))
console.log(
  `collected ${files.length} files, ${offset} bytes in ${stats.ms} ms`,
)
