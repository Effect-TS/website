/**
 * dist/manifest.json: what the build produced. build-wasm.ts writes `wasm` and keeps any other entry.
 */
import * as fs from "node:fs"
import * as path from "node:path"

export interface WasmManifest {
  readonly file: string
  readonly mode: "release" | "dev"
  readonly bytes: number
  readonly gzipBytes: number
  readonly brotliBytes: number
  /** Size before wasm-opt (the same as `bytes` for dev builds). */
  readonly unoptimizedBytes: number
  readonly sha256: string
  readonly initialMemoryPages: number
  readonly imports: ReadonlyArray<string>
  readonly upstream: {
    readonly effectTsgo: {
      readonly repository: string
      readonly commit: string
    }
    readonly tsrs: {
      readonly repository: string
      readonly commit: string
      readonly version: string
    }
  }
  readonly toolchain: {
    readonly rustc: string
    readonly target: string
    readonly wasmOpt: string | null
  }
  /** Hash of everything the build depends on; an unchanged hash makes the next build a no-op. */
  readonly inputsHash: string
  readonly buildSeconds: number
}

export interface Manifest {
  readonly wasm?: WasmManifest
}

export const readManifest = (distDir: string): Manifest => {
  try {
    return JSON.parse(
      fs.readFileSync(path.join(distDir, "manifest.json"), "utf8"),
    ) as Manifest
  } catch {
    return {}
  }
}

export const updateManifest = (distDir: string, patch: Manifest) => {
  fs.mkdirSync(distDir, { recursive: true })
  const next = { ...readManifest(distDir), ...patch }
  fs.writeFileSync(
    path.join(distDir, "manifest.json"),
    JSON.stringify(next, null, 2) + "\n",
  )
}
