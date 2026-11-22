import * as fs from "node:fs"
import { createRequire } from "node:module"
import * as os from "node:os"
import * as path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

export interface LocalWorkspace {
  readonly rootDir: string
  readonly rootUri: string
  readonly mainFilePath: string
  readonly mainFileUri: string
  readonly cleanup: () => void
}

const packageRequire = createRequire(import.meta.url)
const packageRoot = fileURLToPath(new URL("..", import.meta.url))

/**
 * Locate the native `@effect/tsgo` Rust `tsrs` binary directly so `ChildProcess`
 * owns the PID for clean `SIGTERM` teardown on disconnect.
 */
export const resolveTsrsBinary = (options?: {
  readonly env?: NodeJS.ProcessEnv | undefined
}): string => {
  const env = options?.env ?? process.env
  const envOverride = env.TSRS_BIN ?? env.TSGO_BIN
  if (envOverride && fs.existsSync(envOverride)) {
    return envOverride
  }

  const exeName = process.platform === "win32" ? "tsrs.exe" : "tsrs"
  const platformPkg = `@effect/tsgo-${process.platform}-${process.arch}`

  let platformPkgDir: string | undefined
  try {
    const tsgoPkgJson = packageRequire.resolve("@effect/tsgo/package.json")
    const tsgoRequire = createRequire(tsgoPkgJson)
    const platformPkgJson = tsgoRequire.resolve(`${platformPkg}/package.json`)
    platformPkgDir = path.dirname(platformPkgJson)
  } catch {
    try {
      const platformPkgJson = packageRequire.resolve(
        `${platformPkg}/package.json`,
      )
      platformPkgDir = path.dirname(platformPkgJson)
    } catch {
      platformPkgDir = undefined
    }
  }

  if (platformPkgDir !== undefined) {
    const upstreamPath = path.join(platformPkgDir, "lib", "upstream.json")
    if (fs.existsSync(upstreamPath)) {
      const upstream = JSON.parse(fs.readFileSync(upstreamPath, "utf8")) as {
        readonly tags?: {
          readonly tsrs?: {
            readonly latest?: string
          }
        }
      }
      const latest = upstream.tags?.tsrs?.latest
      if (typeof latest === "string") {
        const candidate = path.join(
          platformPkgDir,
          "artifacts",
          "tsrs",
          latest,
          exeName,
        )
        if (fs.existsSync(candidate)) {
          return candidate
        }
      }
    }

    // Fallback: scan artifacts/tsrs/* for the latest available binary
    const tsrsRoot = path.join(platformPkgDir, "artifacts", "tsrs")
    if (fs.existsSync(tsrsRoot)) {
      const versions = fs.readdirSync(tsrsRoot).sort().reverse()
      for (const version of versions) {
        const candidate = path.join(tsrsRoot, version, exeName)
        if (fs.existsSync(candidate)) {
          return candidate
        }
      }
    }
  }

  throw new Error(
    `Could not locate native @effect/tsgo tsrs binary (${platformPkg}/artifacts/tsrs/<latest>/${exeName}). ` +
      `Set TSRS_BIN or install @effect/tsgo.`,
  )
}

const resolveEffectPackageDir = (): string => {
  const pkgJson = packageRequire.resolve("effect/package.json")
  return fs.realpathSync(path.dirname(pkgJson))
}

/**
 * Create a local read-only (`0o555`/`0o444`) workspace mirroring the production
 * `/workspace` container layout:
 * - `tsconfig.json` with `@effect/language-service` plugin enabled
 * - `node_modules/effect` symlinked to the repo's installed `effect` package
 * - `main.ts` placeholder overridden in-memory per session via `textDocument/didOpen`
 */
export const createLocalReadOnlyWorkspace = (options?: {
  readonly effectPackageDir?: string | undefined
}): LocalWorkspace => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "lsp-bridge-ro-ws-"))
  const nodeModulesDir = path.join(rootDir, "node_modules")
  const effectSource = options?.effectPackageDir ?? resolveEffectPackageDir()
  const tsconfigPath = path.join(rootDir, "tsconfig.json")
  const mainFilePath = path.join(rootDir, "main.ts")

  fs.mkdirSync(nodeModulesDir)
  fs.symlinkSync(effectSource, path.join(nodeModulesDir, "effect"), "dir")

  const templateTsconfigPath = path.resolve(
    packageRoot,
    "workspace.tsconfig.json",
  )

  fs.copyFileSync(templateTsconfigPath, tsconfigPath)
  fs.writeFileSync(mainFilePath, "export {}\n", "utf8")

  // Lock down permissions read-only (0o444 files, 0o555 directories)
  fs.chmodSync(tsconfigPath, 0o444)
  fs.chmodSync(mainFilePath, 0o444)
  fs.chmodSync(nodeModulesDir, 0o555)
  fs.chmodSync(rootDir, 0o555)

  return {
    rootDir,
    rootUri: pathToFileURL(rootDir).href.replace(/\/$/, ""),
    mainFilePath,
    mainFileUri: pathToFileURL(mainFilePath).href,
    cleanup: () => {
      try {
        fs.chmodSync(rootDir, 0o755)
        fs.chmodSync(nodeModulesDir, 0o755)
        fs.chmodSync(tsconfigPath, 0o644)
        fs.chmodSync(mainFilePath, 0o644)
        fs.rmSync(rootDir, { recursive: true, force: true })
      } catch {
        // best-effort cleanup
      }
    },
  }
}
