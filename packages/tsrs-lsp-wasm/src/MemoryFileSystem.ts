/**
 * The in-memory file system behind the module's `tsrs_host.fs` import. Paths are absolute POSIX paths; directories
 * exist explicitly (`mkdir`) or because a file lives below them. Every mutation made through this API is reported
 * to `watch` listeners, which is how the host turns run-time changes into `workspace/didChangeWatchedFiles`.
 *
 * No Node built-ins: this runs in a browser Worker.
 */

export type FileContents = string | Uint8Array

export type EntryKind = "file" | "directory"

export interface FileStat {
  readonly kind: EntryKind
  readonly size: number
  /** Nanoseconds; bumped on every write so mtime-based caches see the change. */
  readonly mtimeNs: bigint
}

export interface DirectoryEntry {
  readonly name: string
  readonly kind: EntryKind
}

export type FileChangeType = "created" | "changed" | "deleted"

export interface FileChange {
  readonly type: FileChangeType
  readonly path: string
  readonly kind: EntryKind
}

export class FileNotFoundError extends Error {
  readonly path: string
  constructor(path: string) {
    super(`no such file or directory: ${path}`)
    this.name = "FileNotFoundError"
    this.path = path
  }
}

export class FileSystemError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "FileSystemError"
  }
}

interface FileEntry {
  data: Uint8Array
  mtimeNs: bigint
}

const encoder = new TextEncoder()
const decoder = new TextDecoder("utf-8", { ignoreBOM: true })

const toBytes = (data: FileContents): Uint8Array =>
  typeof data === "string" ? encoder.encode(data) : data

/** Absolute, `/`-separated, without `.`/`..` segments or a trailing slash. `\` counts as a separator. */
export const normalizePath = (path: string): string => {
  const parts: Array<string> = []
  for (const part of path.replace(/\\/g, "/").split("/")) {
    if (part === "" || part === ".") continue
    if (part === "..") parts.pop()
    else parts.push(part)
  }
  return "/" + parts.join("/")
}

const parentOf = (path: string): string => {
  const i = path.lastIndexOf("/")
  return i <= 0 ? "/" : path.slice(0, i)
}

const isBelow = (path: string, dir: string) =>
  dir === "/" ? path !== "/" : path.startsWith(dir + "/")

export class MemoryFileSystem {
  private readonly fileMap = new Map<string, FileEntry>()
  private readonly dirSet = new Set<string>(["/"])
  private readonly listeners = new Set<
    (changes: ReadonlyArray<FileChange>) => void
  >()
  private clock = 0n

  constructor(
    files?:
      | Iterable<readonly [string, FileContents]>
      | Readonly<Record<string, FileContents>>,
  ) {
    if (files !== undefined) {
      const entries = Symbol.iterator in files ? files : Object.entries(files)
      for (const [path, data] of entries as Iterable<
        readonly [string, FileContents]
      >) {
        this.putFile(normalizePath(path), toBytes(data), [])
      }
    }
  }

  // -- queries ------------------------------------------------------------------------------------------------

  exists(path: string): boolean {
    const p = normalizePath(path)
    return this.fileMap.has(p) || this.dirSet.has(p)
  }

  isFile(path: string): boolean {
    return this.fileMap.has(normalizePath(path))
  }

  isDirectory(path: string): boolean {
    return this.dirSet.has(normalizePath(path))
  }

  stat(path: string): FileStat {
    const p = normalizePath(path)
    const file = this.fileMap.get(p)
    if (file !== undefined)
      return { kind: "file", size: file.data.length, mtimeNs: file.mtimeNs }
    if (this.dirSet.has(p)) return { kind: "directory", size: 0, mtimeNs: 0n }
    throw new FileNotFoundError(p)
  }

  /** The stored bytes (not a copy; callers must not mutate them). */
  readFile(path: string): Uint8Array {
    const p = normalizePath(path)
    const file = this.fileMap.get(p)
    if (file === undefined) throw new FileNotFoundError(p)
    return file.data
  }

  readTextFile(path: string): string {
    return decoder.decode(this.readFile(path))
  }

  readDirectory(path: string): Array<DirectoryEntry> {
    const p = normalizePath(path)
    if (!this.dirSet.has(p)) throw new FileNotFoundError(p)
    const prefix = p === "/" ? "/" : p + "/"
    const out = new Map<string, EntryKind>()
    for (const dir of this.dirSet) {
      if (
        dir !== p &&
        dir.startsWith(prefix) &&
        !dir.slice(prefix.length).includes("/")
      ) {
        out.set(dir.slice(prefix.length), "directory")
      }
    }
    for (const file of this.fileMap.keys()) {
      if (file.startsWith(prefix) && !file.slice(prefix.length).includes("/")) {
        out.set(file.slice(prefix.length), "file")
      }
    }
    return [...out].map(([name, kind]) => ({ name, kind }))
  }

  realpath(path: string): string {
    return normalizePath(path)
  }

  /** Every file path, optionally only those below `directory`. */
  listFiles(directory?: string): Array<string> {
    const all = [...this.fileMap.keys()]
    if (directory === undefined) return all
    const d = normalizePath(directory)
    return all.filter((p) => isBelow(p, d))
  }

  // -- mutations ----------------------------------------------------------------------------------------------

  /** Creates or replaces a file, creating missing parent directories. Uint8Array contents are stored as given. */
  writeFile(path: string, data: FileContents): void {
    const changes: Array<FileChange> = []
    this.putFile(normalizePath(path), toBytes(data), changes)
    this.emit(changes)
  }

  appendFile(path: string, data: FileContents): void {
    const p = normalizePath(path)
    const prev = this.fileMap.get(p)?.data ?? new Uint8Array(0)
    const add = toBytes(data)
    const next = new Uint8Array(prev.length + add.length)
    next.set(prev)
    next.set(add, prev.length)
    this.writeFile(p, next)
  }

  /** Creates a directory and its missing parents. */
  mkdir(path: string): void {
    const p = normalizePath(path)
    if (this.fileMap.has(p)) throw new FileSystemError(`a file exists at ${p}`)
    const changes: Array<FileChange> = []
    this.addDirs(p, changes)
    this.emit(changes)
  }

  /** Removes a file, or a directory with everything below it. Returns false when nothing was there. */
  remove(path: string): boolean {
    const p = normalizePath(path)
    if (p === "/") throw new FileSystemError("cannot remove /")
    const changes: Array<FileChange> = []
    this.removeEntries(p, changes)
    this.emit(changes)
    return changes.length > 0
  }

  /**
   * Moves a file or directory. A file replaces an existing file at `to`; a directory may not replace anything.
   * Reported as deletions of the old paths and creations of the new ones.
   */
  rename(from: string, to: string): void {
    const src = normalizePath(from)
    const dst = normalizePath(to)
    if (src === dst) return
    if (isBelow(dst, src))
      throw new FileSystemError(`cannot move ${src} into itself`)
    const changes: Array<FileChange> = []
    const file = this.fileMap.get(src)
    if (file !== undefined) {
      if (this.dirSet.has(dst))
        throw new FileSystemError(`a directory exists at ${dst}`)
      this.removeEntries(src, changes)
      this.putFile(dst, file.data, changes)
      this.emit(changes)
      return
    }
    if (!this.dirSet.has(src)) throw new FileNotFoundError(src)
    if (this.exists(dst)) throw new FileSystemError(`${dst} already exists`)
    const files = [...this.fileMap].filter(([p]) => isBelow(p, src))
    const dirs = [...this.dirSet].filter((d) => d === src || isBelow(d, src))
    this.removeEntries(src, changes)
    for (const d of dirs) this.addDirs(dst + d.slice(src.length), changes)
    for (const [p, entry] of files)
      this.putFile(dst + p.slice(src.length), entry.data, changes)
    this.emit(changes)
  }

  /** Listens to changes made through this API. Returns the unsubscribe function. */
  watch(listener: (changes: ReadonlyArray<FileChange>) => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  // -- internals ----------------------------------------------------------------------------------------------

  private tick(): bigint {
    this.clock += 1_000_000n
    return this.clock
  }

  private addDirs(dir: string, changes: Array<FileChange>) {
    const missing: Array<string> = []
    for (let d = dir; !this.dirSet.has(d); d = parentOf(d)) {
      if (this.fileMap.has(d))
        throw new FileSystemError(`a file exists at ${d}`)
      missing.push(d)
    }
    for (const d of missing.reverse()) {
      this.dirSet.add(d)
      changes.push({ type: "created", path: d, kind: "directory" })
    }
  }

  private putFile(path: string, data: Uint8Array, changes: Array<FileChange>) {
    if (path === "/" || this.dirSet.has(path))
      throw new FileSystemError(`a directory exists at ${path}`)
    this.addDirs(parentOf(path), changes)
    const existed = this.fileMap.has(path)
    this.fileMap.set(path, { data, mtimeNs: this.tick() })
    changes.push({ type: existed ? "changed" : "created", path, kind: "file" })
  }

  private removeEntries(path: string, changes: Array<FileChange>) {
    if (this.fileMap.delete(path)) {
      changes.push({ type: "deleted", path, kind: "file" })
      return
    }
    if (!this.dirSet.has(path)) return
    for (const p of [...this.fileMap.keys()]) {
      if (isBelow(p, path)) {
        this.fileMap.delete(p)
        changes.push({ type: "deleted", path: p, kind: "file" })
      }
    }
    for (const d of [...this.dirSet]) {
      if (isBelow(d, path)) {
        this.dirSet.delete(d)
        changes.push({ type: "deleted", path: d, kind: "directory" })
      }
    }
    this.dirSet.delete(path)
    changes.push({ type: "deleted", path, kind: "directory" })
  }

  private emit(changes: ReadonlyArray<FileChange>) {
    if (changes.length === 0) return
    for (const listener of this.listeners) listener(changes)
  }
}
