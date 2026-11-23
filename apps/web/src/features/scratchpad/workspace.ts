import * as Context from "effect/Context"
import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as PubSub from "effect/PubSub"
import * as Schema from "effect/Schema"
import * as Semaphore from "effect/Semaphore"
import * as Stream from "effect/Stream"

export const WORKSPACE_MOUNT_ROOT = "/workspace"
export const WORKSPACE_ROOT_URI = "file:///workspace"
export const WORKSPACE_MAX_FILES = 50
export const WORKSPACE_MAX_FILE_BYTES = 256 * 1024
export const WORKSPACE_MAX_TOTAL_BYTES = 1024 * 1024

/** Top-level folders the Workspace never holds (the Container owns them). */
const RESERVED_TOP_LEVEL = new Set(["node_modules", "dist"])

/**
 * Files only the host writes (synced back from the Container). The editor can
 * read them but not change them.
 */
export const WORKSPACE_READ_ONLY_PATHS: ReadonlySet<string> = new Set([
  "package.json",
  "pnpm-lock.yaml",
])

/** Files that cannot be deleted or renamed. */
export const WORKSPACE_PROTECTED_PATHS: ReadonlySet<string> = new Set([
  ...WORKSPACE_READ_ONLY_PATHS,
  "tsconfig.json",
  "src/main.ts",
])

export const isReadOnlyPath = (relPath: string): boolean =>
  WORKSPACE_READ_ONLY_PATHS.has(relPath)

const textEncoder = new TextEncoder()

export const utf8ByteLength = (text: string): number =>
  textEncoder.encode(text).byteLength

export type WorkspaceErrorCode =
  | "invalid-path"
  | "already-exists"
  | "not-found"
  | "file-too-large"
  | "workspace-too-large"
  | "too-many-files"
  | "read-only"
  | "protected"

export class WorkspaceError extends Data.TaggedError("WorkspaceError")<{
  readonly code: WorkspaceErrorCode
  readonly message: string
}> {}

export type WorkspaceNode =
  | {
      readonly _tag: "Directory"
      readonly name: string
      readonly path: string
      readonly children: ReadonlyArray<WorkspaceNode>
    }
  | {
      readonly _tag: "File"
      readonly name: string
      readonly path: string
      readonly bytes: number
    }

export interface WorkspaceFileEntry {
  readonly path: string
  readonly content: string
}

export const WorkspaceSnapshotSchema = Schema.Struct({
  version: Schema.Literal(1),
  files: Schema.Record(Schema.String, Schema.String),
  directories: Schema.optional(Schema.Array(Schema.String)),
})

export type WorkspaceSnapshot = typeof WorkspaceSnapshotSchema.Type

export type WorkspaceEvent =
  | {
      readonly _tag: "FileCreated"
      readonly path: string
      readonly content: string
    }
  | {
      readonly _tag: "FileChanged"
      readonly path: string
      readonly content: string
    }
  | {
      readonly _tag: "FileDeleted"
      readonly path: string
    }
  | {
      readonly _tag: "FileRenamed"
      readonly oldPath: string
      readonly newPath: string
      readonly content: string
    }
  | {
      readonly _tag: "DirectoryChanged"
    }

export interface WorkspaceLimits {
  readonly maxFiles?: number | undefined
  readonly maxFileBytes?: number | undefined
  readonly maxTotalBytes?: number | undefined
}

export interface WorkspaceService {
  readonly rootUri: string
  readonly listFiles: Effect.Effect<
    ReadonlyArray<WorkspaceFileEntry>,
    WorkspaceError
  >
  readonly getTree: Effect.Effect<ReadonlyArray<WorkspaceNode>, WorkspaceError>
  readonly readFile: (path: string) => Effect.Effect<string, WorkspaceError>
  /** An editor write: fails with `read-only` for `package.json` and `pnpm-lock.yaml`. */
  readonly writeFile: (
    path: string,
    content: string,
  ) => Effect.Effect<void, WorkspaceError>
  /**
   * A host write, for files synced back from the Container. Unlike
   * `writeFile` it can write read-only files. Limits still apply.
   */
  readonly writeHostFile: (
    path: string,
    content: string,
  ) => Effect.Effect<void, WorkspaceError>
  readonly createFile: (
    path: string,
    content?: string,
  ) => Effect.Effect<void, WorkspaceError>
  readonly createDirectory: (
    path: string,
  ) => Effect.Effect<void, WorkspaceError>
  readonly rename: (
    oldPath: string,
    newPath: string,
  ) => Effect.Effect<void, WorkspaceError>
  readonly remove: (path: string) => Effect.Effect<void, WorkspaceError>
  readonly snapshot: Effect.Effect<WorkspaceSnapshot, WorkspaceError>
  readonly restoreSnapshot: (
    snapshot: WorkspaceSnapshot,
  ) => Effect.Effect<void, WorkspaceError>
  readonly events: Stream.Stream<WorkspaceEvent>
}

export class Workspace extends Context.Service<Workspace, WorkspaceService>()(
  "@website/scratchpad/Workspace",
) {}

const fail = (code: WorkspaceErrorCode, message: string) =>
  Effect.fail(new WorkspaceError({ code, message }))

export const normalizeRelativePath = (
  raw: string,
): Effect.Effect<string, WorkspaceError> =>
  Effect.suspend(() => {
    const trimmed = raw.trim().replaceAll("\\", "/")
    const stripped = trimmed.replace(/^\/+/, "").replace(/\/+$/, "")
    if (stripped.length === 0) {
      return fail("invalid-path", "Path cannot be empty.")
    }
    if (stripped.includes("\0")) {
      return fail("invalid-path", "Path cannot contain null bytes.")
    }
    const segments = stripped.split("/")
    for (const segment of segments) {
      if (segment.length === 0 || segment === "." || segment === "..") {
        return fail("invalid-path", `Invalid path segment in "${raw}".`)
      }
    }
    if (RESERVED_TOP_LEVEL.has(segments[0]!)) {
      return fail("invalid-path", `Paths inside ${segments[0]} are reserved.`)
    }
    return Effect.succeed(stripped)
  })

export const pathToWorkspaceUri = (
  relPath: string,
  rootUri: string = WORKSPACE_ROOT_URI,
): string => {
  const cleanRoot = rootUri.replace(/\/+$/, "")
  const cleanRel = relPath.replace(/^\/+/, "")
  const encoded = cleanRel
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/")
  return `${cleanRoot}/${encoded}`
}

export const workspaceUriToPath = (
  uri: string,
  rootUri: string = WORKSPACE_ROOT_URI,
): string | undefined => {
  const cleanRoot = rootUri.replace(/\/+$/, "")
  const prefix = `${cleanRoot}/`
  if (!uri.startsWith(prefix)) {
    return undefined
  }
  const rest = uri.slice(prefix.length)
  try {
    const decoded = rest
      .split("/")
      .map((segment) => decodeURIComponent(segment))
      .join("/")
    if (
      decoded.length === 0 ||
      RESERVED_TOP_LEVEL.has(decoded.split("/")[0]!)
    ) {
      return undefined
    }
    return decoded
  } catch {
    return undefined
  }
}

const isSameOrBelow = (path: string, ancestor: string): boolean =>
  path === ancestor || path.startsWith(`${ancestor}/`)

const ancestorsOf = (relPath: string): Array<string> => {
  const out: Array<string> = []
  let idx = relPath.indexOf("/")
  while (idx !== -1) {
    out.push(relPath.slice(0, idx))
    idx = relPath.indexOf("/", idx + 1)
  }
  return out
}

const basenameOf = (relPath: string): string =>
  relPath.slice(relPath.lastIndexOf("/") + 1)

/** Depth-first order with sorted names at each level (`a/x` before `a-b`). */
export const comparePaths = (a: string, b: string): number => {
  const as = a.split("/")
  const bs = b.split("/")
  const n = Math.min(as.length, bs.length)
  for (let i = 0; i < n; i++) {
    if (as[i] !== bs[i]) return as[i]! < bs[i]! ? -1 : 1
  }
  return as.length - bs.length
}

const sortNodes = (nodes: Array<WorkspaceNode>): Array<WorkspaceNode> =>
  nodes.sort((a, b) => {
    if (a._tag !== b._tag) {
      return a._tag === "Directory" ? -1 : 1
    }
    return a.name.localeCompare(b.name)
  })

interface StoredFile {
  readonly content: string
  readonly bytes: number
}

/**
 * The Workspace's state: files by path, every folder (including the ones files
 * imply), and running totals so limit checks never re-read the tree.
 */
class Store {
  readonly files = new Map<string, StoredFile>()
  readonly directories = new Set<string>()
  totalBytes = 0

  /** A file can be stored at `relPath` without colliding with a folder. */
  checkFileSlot(relPath: string): WorkspaceError | undefined {
    if (this.directories.has(relPath)) {
      return new WorkspaceError({
        code: "already-exists",
        message: `A folder already exists at "${relPath}".`,
      })
    }
    return this.checkAncestors(relPath)
  }

  /** No ancestor of `relPath` is a file. */
  checkAncestors(relPath: string): WorkspaceError | undefined {
    for (const ancestor of ancestorsOf(relPath)) {
      if (this.files.has(ancestor)) {
        return new WorkspaceError({
          code: "invalid-path",
          message: `"${ancestor}" is a file, not a folder.`,
        })
      }
    }
    return undefined
  }

  setFile(relPath: string, content: string, bytes: number): void {
    const previous = this.files.get(relPath)
    this.totalBytes += bytes - (previous?.bytes ?? 0)
    this.files.set(relPath, { content, bytes })
    this.addDirectories(relPath)
  }

  deleteFile(relPath: string): void {
    const previous = this.files.get(relPath)
    if (previous === undefined) return
    this.totalBytes -= previous.bytes
    this.files.delete(relPath)
  }

  /** Adds the folders above `relPath`. */
  addDirectories(relPath: string): void {
    for (const ancestor of ancestorsOf(relPath)) {
      this.directories.add(ancestor)
    }
  }

  /** Files at or below `relPath`, in listing order. */
  filesUnder(relPath: string): Array<[string, StoredFile]> {
    return [...this.files]
      .filter(([path]) => isSameOrBelow(path, relPath))
      .sort(([a], [b]) => comparePaths(a, b))
  }

  directoriesUnder(relPath: string): Array<string> {
    return [...this.directories].filter((dir) => isSameOrBelow(dir, relPath))
  }

  listFiles(): Array<WorkspaceFileEntry> {
    return [...this.files]
      .sort(([a], [b]) => comparePaths(a, b))
      .map(([path, file]) => ({ path, content: file.content }))
  }

  tree(): Array<WorkspaceNode> {
    const children = new Map<string, Array<WorkspaceNode>>()
    const childrenOf = (dir: string) => {
      let list = children.get(dir)
      if (list === undefined) {
        list = []
        children.set(dir, list)
      }
      return list
    }
    const parentOf = (path: string) => {
      const idx = path.lastIndexOf("/")
      return idx === -1 ? "" : path.slice(0, idx)
    }
    for (const [path, file] of this.files) {
      childrenOf(parentOf(path)).push({
        _tag: "File",
        name: basenameOf(path),
        path,
        bytes: file.bytes,
      })
    }
    const build = (dir: string): Array<WorkspaceNode> => {
      const nodes = childrenOf(dir)
      for (const sub of this.directories) {
        if (parentOf(sub) === dir) {
          nodes.push({
            _tag: "Directory",
            name: basenameOf(sub),
            path: sub,
            children: build(sub),
          })
        }
      }
      return sortNodes(nodes)
    }
    return build("")
  }
}

/** An in-memory `WorkspaceService`, serializing mutations with a semaphore. */
export const makeMemoryWorkspace = (options?: {
  readonly rootUri?: string | undefined
  readonly initialFiles?: Readonly<Record<string, string>> | undefined
  readonly limits?: WorkspaceLimits | undefined
}): Effect.Effect<WorkspaceService, WorkspaceError> =>
  Effect.gen(function* () {
    const rootUri = options?.rootUri ?? WORKSPACE_ROOT_URI
    const maxFiles = options?.limits?.maxFiles ?? WORKSPACE_MAX_FILES
    const maxFileBytes =
      options?.limits?.maxFileBytes ?? WORKSPACE_MAX_FILE_BYTES
    const maxTotalBytes =
      options?.limits?.maxTotalBytes ?? WORKSPACE_MAX_TOTAL_BYTES

    const pubsub = yield* PubSub.unbounded<WorkspaceEvent>()
    const lock = yield* Semaphore.make(1)
    let store = new Store()

    const fileTooLarge = (relPath: string) =>
      fail(
        "file-too-large",
        `File "${relPath}" exceeds the ${Math.round(maxFileBytes / 1024)} KiB limit.`,
      )

    const writeInternal = (
      rawPath: string,
      content: string,
      mode: "create" | "upsert",
      origin: "editor" | "host",
    ): Effect.Effect<void, WorkspaceError> =>
      lock.withPermits(1)(
        Effect.gen(function* () {
          const relPath = yield* normalizeRelativePath(rawPath)
          if (origin === "editor" && isReadOnlyPath(relPath)) {
            return yield* fail(
              "read-only",
              `"${relPath}" is read-only. It is updated by the package manager.`,
            )
          }
          const slotError = store.checkFileSlot(relPath)
          if (slotError !== undefined) return yield* Effect.fail(slotError)

          const previous = store.files.get(relPath)
          if (mode === "create" && previous !== undefined) {
            return yield* fail("already-exists", `"${relPath}" already exists.`)
          }

          const fileBytes = utf8ByteLength(content)
          if (fileBytes > maxFileBytes) {
            return yield* fileTooLarge(relPath)
          }
          if (previous === undefined && store.files.size + 1 > maxFiles) {
            return yield* fail(
              "too-many-files",
              `Workspace cannot exceed ${maxFiles} files.`,
            )
          }
          const nextTotalBytes =
            store.totalBytes - (previous?.bytes ?? 0) + fileBytes
          if (nextTotalBytes > maxTotalBytes) {
            return yield* fail(
              "workspace-too-large",
              `Workspace exceeds the ${Math.round(maxTotalBytes / (1024 * 1024))} MiB total limit.`,
            )
          }

          store.setFile(relPath, content, fileBytes)
          yield* PubSub.publish(
            pubsub,
            previous === undefined
              ? { _tag: "FileCreated", path: relPath, content }
              : { _tag: "FileChanged", path: relPath, content },
          )
        }),
      )

    if (options?.initialFiles !== undefined) {
      for (const [relPath, content] of Object.entries(options.initialFiles)) {
        yield* writeInternal(relPath, content, "upsert", "host")
      }
    }

    const listFiles = Effect.sync(() => store.listFiles())

    const getTree = Effect.sync(() => store.tree())

    const readFile = (rawPath: string): Effect.Effect<string, WorkspaceError> =>
      Effect.gen(function* () {
        const relPath = yield* normalizeRelativePath(rawPath)
        const file = store.files.get(relPath)
        if (file === undefined) {
          return yield* fail("not-found", `File "${relPath}" not found.`)
        }
        return file.content
      })

    const createDirectory = (
      rawPath: string,
    ): Effect.Effect<void, WorkspaceError> =>
      lock.withPermits(1)(
        Effect.gen(function* () {
          const relPath = yield* normalizeRelativePath(rawPath)
          if (store.files.has(relPath) || store.directories.has(relPath)) {
            return yield* fail("already-exists", `"${relPath}" already exists.`)
          }
          const ancestorError = store.checkAncestors(relPath)
          if (ancestorError !== undefined) {
            return yield* Effect.fail(ancestorError)
          }
          store.directories.add(relPath)
          store.addDirectories(relPath)
          yield* PubSub.publish(pubsub, { _tag: "DirectoryChanged" })
        }),
      )

    /** Fails when `relPath` is, or holds, a protected file that exists. */
    const checkNotProtected = (relPath: string, action: string) => {
      for (const protectedPath of WORKSPACE_PROTECTED_PATHS) {
        if (
          store.files.has(protectedPath) &&
          isSameOrBelow(protectedPath, relPath)
        ) {
          return fail(
            "protected",
            protectedPath === relPath
              ? `"${relPath}" cannot be ${action}.`
              : `"${relPath}" holds "${protectedPath}", which cannot be ${action}.`,
          )
        }
      }
      return Effect.void
    }

    const rename = (
      rawOldPath: string,
      rawNewPath: string,
    ): Effect.Effect<void, WorkspaceError> =>
      lock.withPermits(1)(
        Effect.gen(function* () {
          const oldPath = yield* normalizeRelativePath(rawOldPath)
          const isFile = store.files.has(oldPath)
          const isDirectory = store.directories.has(oldPath)
          if (!isFile && !isDirectory) {
            return yield* fail("not-found", `"${oldPath}" not found.`)
          }
          const newPath = yield* normalizeRelativePath(rawNewPath)
          if (oldPath === newPath) {
            return
          }
          if (isDirectory && newPath.startsWith(`${oldPath}/`)) {
            return yield* fail(
              "invalid-path",
              "Cannot move a folder into itself.",
            )
          }
          yield* checkNotProtected(oldPath, "renamed")
          if (isFile && isReadOnlyPath(newPath)) {
            return yield* fail(
              "read-only",
              `"${newPath}" is read-only. It is updated by the package manager.`,
            )
          }
          if (store.files.has(newPath) || store.directories.has(newPath)) {
            return yield* fail("already-exists", `"${newPath}" already exists.`)
          }
          const ancestorError = store.checkAncestors(newPath)
          if (ancestorError !== undefined) {
            return yield* Effect.fail(ancestorError)
          }

          const remap = (path: string) =>
            `${newPath}${path.slice(oldPath.length)}`
          const moved = store.filesUnder(oldPath)
          const movedDirectories = store.directoriesUnder(oldPath)
          for (const [path] of moved) store.deleteFile(path)
          for (const dir of movedDirectories) store.directories.delete(dir)
          for (const dir of movedDirectories) store.directories.add(remap(dir))
          for (const [path, file] of moved) {
            store.setFile(remap(path), file.content, file.bytes)
          }
          store.addDirectories(newPath)

          for (const [path, file] of moved) {
            yield* PubSub.publish(pubsub, {
              _tag: "FileRenamed",
              oldPath: path,
              newPath: remap(path),
              content: file.content,
            })
          }
          if (isDirectory) {
            yield* PubSub.publish(pubsub, { _tag: "DirectoryChanged" })
          }
        }),
      )

    const remove = (rawPath: string): Effect.Effect<void, WorkspaceError> =>
      lock.withPermits(1)(
        Effect.gen(function* () {
          const relPath = yield* normalizeRelativePath(rawPath)
          const isFile = store.files.has(relPath)
          const isDirectory = store.directories.has(relPath)
          if (!isFile && !isDirectory) {
            return yield* fail("not-found", `"${relPath}" not found.`)
          }
          yield* checkNotProtected(relPath, "deleted")

          const removed = store.filesUnder(relPath)
          for (const [path] of removed) store.deleteFile(path)
          for (const dir of store.directoriesUnder(relPath)) {
            store.directories.delete(dir)
          }
          for (const [path] of removed) {
            yield* PubSub.publish(pubsub, { _tag: "FileDeleted", path })
          }
          if (isDirectory) {
            yield* PubSub.publish(pubsub, { _tag: "DirectoryChanged" })
          }
        }),
      )

    const snapshot = Effect.sync((): WorkspaceSnapshot => {
      const files: Record<string, string> = {}
      for (const entry of store.listFiles()) {
        files[entry.path] = entry.content
      }
      const paths = [...store.files.keys()]
      const emptyDirs = [...store.directories]
        .filter((dir) => !paths.some((path) => path.startsWith(`${dir}/`)))
        .sort(comparePaths)
      return {
        version: 1,
        files,
        ...(emptyDirs.length > 0 ? { directories: emptyDirs } : {}),
      }
    })

    const restoreSnapshot = (
      snap: WorkspaceSnapshot,
    ): Effect.Effect<void, WorkspaceError> =>
      lock.withPermits(1)(
        Effect.gen(function* () {
          // Build the whole next state before touching the current one.
          const entries = Object.entries(snap.files)
          if (entries.length > maxFiles) {
            return yield* fail(
              "too-many-files",
              `Snapshot exceeds ${maxFiles} files.`,
            )
          }
          const next = new Store()
          const created: Array<WorkspaceFileEntry> = []
          for (const [rawPath, content] of entries) {
            const relPath = yield* normalizeRelativePath(rawPath)
            const bytes = utf8ByteLength(content)
            if (bytes > maxFileBytes) {
              return yield* fileTooLarge(relPath)
            }
            const slotError = next.checkFileSlot(relPath)
            if (slotError !== undefined) return yield* Effect.fail(slotError)
            next.setFile(relPath, content, bytes)
            created.push({ path: relPath, content })
          }
          if (next.totalBytes > maxTotalBytes) {
            return yield* fail(
              "workspace-too-large",
              "Snapshot exceeds total workspace size limit.",
            )
          }
          for (const rawDir of snap.directories ?? []) {
            const dir = yield* normalizeRelativePath(rawDir)
            if (next.files.has(dir)) {
              return yield* fail("already-exists", `"${dir}" already exists.`)
            }
            const ancestorError = next.checkAncestors(dir)
            if (ancestorError !== undefined) {
              return yield* Effect.fail(ancestorError)
            }
            next.directories.add(dir)
            next.addDirectories(dir)
          }

          const previous = store.listFiles()
          store = next

          for (const prev of previous) {
            yield* PubSub.publish(pubsub, {
              _tag: "FileDeleted",
              path: prev.path,
            })
          }
          for (const file of created) {
            yield* PubSub.publish(pubsub, {
              _tag: "FileCreated",
              path: file.path,
              content: file.content,
            })
          }
          yield* PubSub.publish(pubsub, { _tag: "DirectoryChanged" })
        }),
      )

    return {
      rootUri,
      listFiles,
      getTree,
      readFile,
      writeFile: (path, content) =>
        writeInternal(path, content, "upsert", "editor"),
      writeHostFile: (path, content) =>
        writeInternal(path, content, "upsert", "host"),
      createFile: (path, content = "") =>
        writeInternal(path, content, "create", "editor"),
      createDirectory,
      rename,
      remove,
      snapshot,
      restoreSnapshot,
      events: Stream.fromPubSub(pubsub),
    }
  })

export const layerMemoryWorkspace = (options?: {
  readonly rootUri?: string | undefined
  readonly initialFiles?: Readonly<Record<string, string>> | undefined
  readonly limits?: WorkspaceLimits | undefined
}): Layer.Layer<Workspace, WorkspaceError> =>
  Layer.effect(Workspace, makeMemoryWorkspace(options))
