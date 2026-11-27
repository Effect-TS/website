/**
 * The types pack: npm packages' declaration files and package.json files in one binary file, read with zero-copy
 * views (prototype 01 measured this against a JSON pack: same compressed size, no 12 MB JSON parse, no re-encoding).
 *
 * Layout (little-endian):
 *
 *   0   4 bytes   magic "TSPK"
 *   4   u32       format version (1)
 *   8   u32       H, the header's byte length
 *   12  H bytes   header, UTF-8 JSON: { packages: [{ name, version }], files: [[path, offset, length], ...] }
 *   12+H          data: the files' bytes; offsets are relative to the start of the data
 *
 * Paths are relative to node_modules ("effect/package.json", "effect/dist/Effect.d.ts").
 *
 * Runtime-agnostic: no Node built-ins.
 */
import { normalizePath, type MemoryFileSystem } from "./MemoryFileSystem.ts"
import { WORKSPACE_NODE_MODULES_PATH } from "./Workspace.ts"

export const TYPES_PACK_MAGIC = "TSPK"
export const TYPES_PACK_VERSION = 1

export interface TypesPackPackage {
  readonly name: string
  readonly version: string
}

export interface TypesPackFile {
  /** Relative to node_modules. */
  readonly path: string
  readonly data: Uint8Array
}

export interface TypesPack {
  readonly packages: ReadonlyArray<TypesPackPackage>
  readonly files: ReadonlyArray<TypesPackFile>
}

export class TypesPackError extends Error {
  constructor(message: string) {
    super(`types pack: ${message}`)
    this.name = "TypesPackError"
  }
}

interface Header {
  readonly packages: ReadonlyArray<TypesPackPackage>
  readonly files: ReadonlyArray<readonly [string, number, number]>
}

const checkPath = (path: string) => {
  if (
    path === "" ||
    path.startsWith("/") ||
    path.includes("\\") ||
    path.split("/").some((s) => s === "" || s === "." || s === "..")
  ) {
    throw new TypesPackError(`invalid path ${JSON.stringify(path)}`)
  }
}

export const encodeTypesPack = (pack: TypesPack): Uint8Array => {
  const files: Array<[string, number, number]> = []
  let offset = 0
  const seen = new Set<string>()
  for (const file of pack.files) {
    checkPath(file.path)
    if (seen.has(file.path))
      throw new TypesPackError(`duplicate path ${file.path}`)
    seen.add(file.path)
    files.push([file.path, offset, file.data.length])
    offset += file.data.length
  }
  const header = new TextEncoder().encode(
    JSON.stringify({ packages: pack.packages, files } satisfies Header),
  )
  const out = new Uint8Array(12 + header.length + offset)
  const view = new DataView(out.buffer)
  out.set(new TextEncoder().encode(TYPES_PACK_MAGIC), 0)
  view.setUint32(4, TYPES_PACK_VERSION, true)
  view.setUint32(8, header.length, true)
  out.set(header, 12)
  let at = 12 + header.length
  for (const file of pack.files) {
    out.set(file.data, at)
    at += file.data.length
  }
  return out
}

/** Reads a pack. File contents are views into `buffer`, not copies. */
export const decodeTypesPack = (
  buffer: ArrayBuffer | Uint8Array,
): TypesPack => {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
  if (bytes.length < 12) throw new TypesPackError("too short")
  const magic = new TextDecoder().decode(bytes.subarray(0, 4))
  if (magic !== TYPES_PACK_MAGIC)
    throw new TypesPackError(`bad magic ${JSON.stringify(magic)}`)
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const version = view.getUint32(4, true)
  if (version !== TYPES_PACK_VERSION)
    throw new TypesPackError(`unsupported version ${version}`)
  const headerLength = view.getUint32(8, true)
  const dataStart = 12 + headerLength
  if (dataStart > bytes.length)
    throw new TypesPackError("header runs past the end")
  let header: Header
  try {
    header = JSON.parse(
      new TextDecoder().decode(bytes.subarray(12, dataStart)),
    ) as Header
  } catch {
    throw new TypesPackError("unreadable header")
  }
  const dataLength = bytes.length - dataStart
  const files = header.files.map(([path, offset, length]): TypesPackFile => {
    checkPath(path)
    if (
      !Number.isInteger(offset) ||
      !Number.isInteger(length) ||
      offset < 0 ||
      length < 0 ||
      offset + length > dataLength
    ) {
      throw new TypesPackError(`entry ${path} is out of bounds`)
    }
    return {
      path,
      data: bytes.subarray(dataStart + offset, dataStart + offset + length),
    }
  })
  return { packages: header.packages, files }
}

/**
 * Writes a pack's files below `nodeModulesPath` (default /workspace/node_modules), as zero-copy views. Accepts the
 * encoded bytes or a decoded pack. Returns the decoded pack.
 */
export const mountTypesPack = (
  fs: MemoryFileSystem,
  pack: ArrayBuffer | Uint8Array | TypesPack,
  nodeModulesPath: string = WORKSPACE_NODE_MODULES_PATH,
): TypesPack => {
  const decoded =
    pack instanceof ArrayBuffer || pack instanceof Uint8Array
      ? decodeTypesPack(pack)
      : pack
  const root = normalizePath(nodeModulesPath)
  for (const file of decoded.files)
    fs.writeFile(`${root}/${file.path}`, file.data)
  return decoded
}
