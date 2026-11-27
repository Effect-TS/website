/**
 * Collects npm packages' declaration files and package.json files for a types pack. Packages are resolved the way
 * Node resolves them from this package (so `effect` is the version this package depends on), not from fixed paths.
 */
import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import type { TypesPack, TypesPackFile } from "../src/TypesPack.ts"

export const PACKAGE_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
)

/** The packages the Scratchpad needs: Effect 4 has no runtime dependencies, so its own files are enough. */
export const DEFAULT_TYPES_PACKAGES: ReadonlyArray<string> = ["effect"]

const DECLARATION = /\.d\.(ts|mts|cts)$/

/** The real directory of `name` as resolved from `from` (walking up node_modules directories). */
export const resolvePackageDir = (
  name: string,
  from: string = PACKAGE_DIR,
): string => {
  for (let dir = from; ; dir = path.dirname(dir)) {
    const candidate = path.join(dir, "node_modules", name, "package.json")
    if (fs.existsSync(candidate))
      return fs.realpathSync(path.dirname(candidate))
    if (path.dirname(dir) === dir) break
  }
  throw new Error(
    `cannot resolve package ${name} from ${from}; is it a dependency of @website/tsrs-lsp-wasm?`,
  )
}

const collect = (root: string, prefix: string, out: Array<TypesPackFile>) => {
  const walk = (dir: string) => {
    const entries = fs
      .readdirSync(dir, { withFileTypes: true })
      .sort((a, b) => (a.name < b.name ? -1 : 1))
    for (const entry of entries) {
      if (entry.name === "node_modules") continue
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (
        entry.isFile() &&
        (DECLARATION.test(entry.name) || entry.name === "package.json")
      ) {
        const rel = path.relative(root, full).split(path.sep).join("/")
        out.push({
          path: `${prefix}/${rel}`,
          data: new Uint8Array(fs.readFileSync(full)),
        })
      }
    }
  }
  walk(root)
}

/** The declaration files and package.json files of `names`, keyed by `<name>/<path inside the package>`. */
export const collectTypesPack = (
  names: ReadonlyArray<string> = DEFAULT_TYPES_PACKAGES,
  from?: string,
): TypesPack => {
  const packages: Array<{ name: string; version: string }> = []
  const files: Array<TypesPackFile> = []
  for (const name of names) {
    const dir = resolvePackageDir(name, from)
    const manifest = JSON.parse(
      fs.readFileSync(path.join(dir, "package.json"), "utf8"),
    ) as { version?: string }
    packages.push({ name, version: manifest.version ?? "0.0.0" })
    collect(dir, name, files)
  }
  return { packages, files }
}
