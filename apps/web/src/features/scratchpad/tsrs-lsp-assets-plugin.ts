import type { AstroIntegration } from "astro"
import * as fs from "node:fs"
import { createRequire } from "node:module"
import * as path from "node:path"
import type { Plugin } from "vite"

/**
 * Serves the Scratchpad's in-browser language server from
 * `@website/tsrs-lsp-wasm`'s build output:
 *
 * - `virtual:tsrs-lsp-assets` exports the wasm module and the gzipped types
 *   pack as Vite asset URLs (hashed files under `/_astro/` in a build, never
 *   inlined) plus their sizes from the package manifest. Keeping the imports
 *   here means type checking does not need the artifacts.
 * - The upstream license files are copied next to them, to
 *   `/_astro/tsrs-lsp-wasm/licenses/`, and served from the same path in dev.
 * - A build stops with the command to run when the artifacts are missing.
 *   `astro dev` only warns, since only `/scratchpad` needs them.
 */

export const TSRS_LSP_ASSETS_MODULE_ID = "virtual:tsrs-lsp-assets"
const RESOLVED_MODULE_ID = `\0${TSRS_LSP_ASSETS_MODULE_ID}`
export const LICENSES_PUBLIC_PATH = "/_astro/tsrs-lsp-wasm/licenses/"

export const TSRS_LSP_BUILD_COMMAND =
  "nix develop -c pnpm --filter @website/tsrs-lsp-wasm build"

const WASM_FILE = "tsrs-effect-lsp.wasm"
const TYPES_PACK_FILE = "effect-types.pack.gz"
const MANIFEST_FILE = "manifest.json"
const LICENSES_DIR = "licenses"

interface ArtifactManifest {
  readonly wasm?: { readonly bytes?: number; readonly mode?: string }
  readonly typesPack?: { readonly gzipBytes?: number }
}

export const resolveTsrsLspDistDir = (fromDir: string): string => {
  const require = createRequire(path.join(fromDir, "package.json"))
  return path.join(
    path.dirname(require.resolve("@website/tsrs-lsp-wasm/package.json")),
    "dist",
  )
}

/** Paths of the artifacts the Scratchpad needs that are missing from `distDir`. */
export const missingTsrsLspArtifacts = (
  distDir: string,
): ReadonlyArray<string> =>
  [WASM_FILE, TYPES_PACK_FILE, MANIFEST_FILE, LICENSES_DIR]
    .map((name) => path.join(distDir, name))
    .filter((file) => !fs.existsSync(file))

export const missingArtifactsMessage = (
  missing: ReadonlyArray<string>,
): string =>
  [
    "The Scratchpad's in-browser language server (@website/tsrs-lsp-wasm) has not been built. Missing:",
    ...missing.map((file) => `  - ${file}`),
    `Build it once with: ${TSRS_LSP_BUILD_COMMAND}`,
    "(or `pnpm run setup:scratchpad` from the repo root; about 4 minutes from a clean cache, see packages/tsrs-lsp-wasm/README.md).",
  ].join("\n")

const readManifest = (distDir: string): ArtifactManifest => {
  try {
    return JSON.parse(
      fs.readFileSync(path.join(distDir, MANIFEST_FILE), "utf8"),
    ) as ArtifactManifest
  } catch {
    return {}
  }
}

export const tsrsLspAssetsVitePlugin = (distDir: string): Plugin => {
  let command: "build" | "serve" = "serve"
  let warned = false
  return {
    name: "scratchpad-tsrs-lsp-assets",
    configResolved(config) {
      command = config.command
    },
    buildStart() {
      const missing = missingTsrsLspArtifacts(distDir)
      if (missing.length === 0) return
      if (command === "build") {
        this.error(missingArtifactsMessage(missing))
      }
      if (!warned) {
        warned = true
        this.warn(missingArtifactsMessage(missing))
      }
    },
    resolveId(id) {
      return id === TSRS_LSP_ASSETS_MODULE_ID ? RESOLVED_MODULE_ID : undefined
    },
    load(id) {
      if (id !== RESOLVED_MODULE_ID) return undefined
      const manifest = readManifest(distDir)
      const wasmPath = path.join(distDir, WASM_FILE)
      const packPath = path.join(distDir, TYPES_PACK_FILE)
      return [
        `export { default as wasmUrl } from ${JSON.stringify(`${wasmPath}?url`)}`,
        `export { default as typesPackUrl } from ${JSON.stringify(`${packPath}?url`)}`,
        `export const wasmBytes = ${JSON.stringify(manifest.wasm?.bytes ?? null)}`,
        `export const typesPackBytes = ${JSON.stringify(manifest.typesPack?.gzipBytes ?? null)}`,
        `export const licensesUrl = ${JSON.stringify(LICENSES_PUBLIC_PATH)}`,
      ].join("\n")
    },
    configureServer(server) {
      server.middlewares.use(LICENSES_PUBLIC_PATH, (req, res, next) => {
        const name = path.basename(decodeURIComponent(req.url ?? ""))
        const file = path.join(distDir, LICENSES_DIR, name)
        if (name.length === 0 || !fs.existsSync(file)) {
          next()
          return
        }
        res.setHeader("Content-Type", "text/plain; charset=utf-8")
        res.end(fs.readFileSync(file))
      })
    },
  }
}

export const tsrsLspAssets = (): AstroIntegration => {
  let distDir = ""
  return {
    name: "scratchpad-tsrs-lsp-assets",
    hooks: {
      "astro:config:setup": ({ config, updateConfig }) => {
        distDir = resolveTsrsLspDistDir(
          path.dirname(new URL("package.json", config.root).pathname),
        )
        updateConfig({ vite: { plugins: [tsrsLspAssetsVitePlugin(distDir)] } })
      },
      "astro:build:done": ({ dir, logger }) => {
        const source = path.join(distDir, LICENSES_DIR)
        const target = path.join(
          dir.pathname,
          ...LICENSES_PUBLIC_PATH.split("/").filter(Boolean),
        )
        fs.mkdirSync(target, { recursive: true })
        for (const name of fs.readdirSync(source)) {
          fs.copyFileSync(path.join(source, name), path.join(target, name))
        }
        logger.info(`copied tsrs-lsp-wasm licenses to ${target}`)
      },
    },
  }
}
