import { MemoryFileSystem } from "@effect-vfs/memory"
import * as BrowserCrypto from "@effect/platform-browser/BrowserCrypto"
import * as Context from "effect/Context"
import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import * as FileSystem from "effect/FileSystem"
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

const ALLOWED_FILE_EXTENSIONS = new Set([".ts", ".tsx"])
const textEncoder = new TextEncoder()

export const utf8ByteLength = (text: string): number =>
  textEncoder.encode(text).byteLength

export type WorkspaceErrorCode =
  | "invalid-path"
  | "invalid-extension"
  | "already-exists"
  | "not-found"
  | "file-too-large"
  | "workspace-too-large"
  | "too-many-files"
  | "io"

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

export interface WorkspaceStats {
  readonly fileCount: number
  readonly totalBytes: number
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
  readonly stats: Effect.Effect<WorkspaceStats, WorkspaceError>
  readonly readFile: (path: string) => Effect.Effect<string, WorkspaceError>
  readonly writeFile: (
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

export const normalizeRelativePath = (
  raw: string,
): Effect.Effect<string, WorkspaceError> =>
  Effect.suspend(() => {
    const trimmed = raw.trim().replaceAll("\\", "/")
    const stripped = trimmed.replace(/^\/+/, "").replace(/\/+$/, "")
    if (stripped.length === 0) {
      return Effect.fail(
        new WorkspaceError({
          code: "invalid-path",
          message: "Path cannot be empty.",
        }),
      )
    }
    if (stripped.includes("\0")) {
      return Effect.fail(
        new WorkspaceError({
          code: "invalid-path",
          message: "Path cannot contain null bytes.",
        }),
      )
    }
    const segments = stripped.split("/")
    for (const segment of segments) {
      if (segment.length === 0 || segment === "." || segment === "..") {
        return Effect.fail(
          new WorkspaceError({
            code: "invalid-path",
            message: `Invalid path segment in "${raw}".`,
          }),
        )
      }
    }
    if (segments[0] === "node_modules") {
      return Effect.fail(
        new WorkspaceError({
          code: "invalid-path",
          message: "Paths inside node_modules are reserved.",
        }),
      )
    }
    if (stripped === "tsconfig.json") {
      return Effect.fail(
        new WorkspaceError({
          code: "invalid-path",
          message: "tsconfig.json is managed by the server.",
        }),
      )
    }
    return Effect.succeed(stripped)
  })

export const validateFilePath = (
  raw: string,
): Effect.Effect<string, WorkspaceError> =>
  normalizeRelativePath(raw).pipe(
    Effect.flatMap((normalized) => {
      const lastSlash = normalized.lastIndexOf("/")
      const basename =
        lastSlash === -1 ? normalized : normalized.slice(lastSlash + 1)
      const dot = basename.lastIndexOf(".")
      const ext = dot > 0 ? basename.slice(dot) : ""
      if (!ALLOWED_FILE_EXTENSIONS.has(ext)) {
        return Effect.fail(
          new WorkspaceError({
            code: "invalid-extension",
            message: "Only .ts and .tsx files are supported.",
          }),
        )
      }
      return Effect.succeed(normalized)
    }),
  )

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
      decoded === "tsconfig.json" ||
      decoded === "node_modules" ||
      decoded.startsWith("node_modules/")
    ) {
      return undefined
    }
    return decoded
  } catch {
    return undefined
  }
}

const toMountPath = (relPath: string): string =>
  `${WORKSPACE_MOUNT_ROOT}/${relPath}`

const parentDirOf = (relPath: string): string | undefined => {
  const idx = relPath.lastIndexOf("/")
  return idx === -1 ? undefined : relPath.slice(0, idx)
}

const mapIoError = (cause: unknown): WorkspaceError =>
  cause instanceof WorkspaceError
    ? cause
    : new WorkspaceError({
        code: "io",
        message: cause instanceof Error ? cause.message : String(cause),
      })

const sortNodes = (nodes: Array<WorkspaceNode>): Array<WorkspaceNode> =>
  nodes.sort((a, b) => {
    if (a._tag !== b._tag) {
      return a._tag === "Directory" ? -1 : 1
    }
    return a.name.localeCompare(b.name)
  })

/**
 * Builds an in-memory `FileSystem.FileSystem` layer backed by `@effect-vfs/memory`
 * using WebCrypto (`BrowserCrypto`), suitable for both browsers and Node 24+.
 */
export const makeMemoryFileSystemLayer =
  (): Layer.Layer<FileSystem.FileSystem> =>
    Layer.fresh(MemoryFileSystem.layer).pipe(
      Layer.provide(
        Layer.merge(BrowserCrypto.layerDigest, BrowserCrypto.layerSecureRandom),
      ),
    )

export const makeWorkspaceFromFileSystem = (options?: {
  readonly rootUri?: string | undefined
  readonly initialFiles?: Readonly<Record<string, string>> | undefined
  readonly limits?: WorkspaceLimits | undefined
}): Effect.Effect<WorkspaceService, WorkspaceError, FileSystem.FileSystem> =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const rootUri = options?.rootUri ?? WORKSPACE_ROOT_URI
    const maxFiles = options?.limits?.maxFiles ?? WORKSPACE_MAX_FILES
    const maxFileBytes =
      options?.limits?.maxFileBytes ?? WORKSPACE_MAX_FILE_BYTES
    const maxTotalBytes =
      options?.limits?.maxTotalBytes ?? WORKSPACE_MAX_TOTAL_BYTES

    const pubsub = yield* PubSub.unbounded<WorkspaceEvent>()
    const lock = yield* Semaphore.make(1)

    yield* fs
      .makeDirectory(WORKSPACE_MOUNT_ROOT, { recursive: true })
      .pipe(Effect.mapError(mapIoError))

    const collectEntries = (
      relDir: string,
    ): Effect.Effect<
      {
        readonly files: Array<WorkspaceFileEntry>
        readonly directories: Array<string>
      },
      WorkspaceError
    > =>
      Effect.gen(function* () {
        const fsDir =
          relDir.length === 0 ? WORKSPACE_MOUNT_ROOT : toMountPath(relDir)
        const names = yield* fs
          .readDirectory(fsDir)
          .pipe(Effect.mapError(mapIoError))

        const files: Array<WorkspaceFileEntry> = []
        const directories: Array<string> = []

        for (const name of [...names].sort()) {
          const childRel = relDir.length === 0 ? name : `${relDir}/${name}`
          const childFs = toMountPath(childRel)
          const info = yield* fs.stat(childFs).pipe(Effect.mapError(mapIoError))
          if (info.type === "Directory") {
            directories.push(childRel)
            const nested = yield* collectEntries(childRel)
            files.push(...nested.files)
            directories.push(...nested.directories)
          } else if (info.type === "File") {
            const content = yield* fs
              .readFileString(childFs)
              .pipe(Effect.mapError(mapIoError))
            files.push({ path: childRel, content })
          }
        }

        return { files, directories }
      })

    const buildTree = (
      relDir: string,
    ): Effect.Effect<ReadonlyArray<WorkspaceNode>, WorkspaceError> =>
      Effect.gen(function* () {
        const fsDir =
          relDir.length === 0 ? WORKSPACE_MOUNT_ROOT : toMountPath(relDir)
        const names = yield* fs
          .readDirectory(fsDir)
          .pipe(Effect.mapError(mapIoError))

        const nodes: Array<WorkspaceNode> = []
        for (const name of names) {
          const childRel = relDir.length === 0 ? name : `${relDir}/${name}`
          const childFs = toMountPath(childRel)
          const info = yield* fs.stat(childFs).pipe(Effect.mapError(mapIoError))
          if (info.type === "Directory") {
            const children = yield* buildTree(childRel)
            nodes.push({
              _tag: "Directory",
              name,
              path: childRel,
              children,
            })
          } else if (info.type === "File") {
            nodes.push({
              _tag: "File",
              name,
              path: childRel,
              bytes: Number(info.size),
            })
          }
        }

        return sortNodes(nodes)
      })

    const computeStats = (): Effect.Effect<WorkspaceStats, WorkspaceError> =>
      collectEntries("").pipe(
        Effect.map(({ files }) => {
          let totalBytes = 0
          for (const f of files) {
            totalBytes += utf8ByteLength(f.content)
          }
          return {
            fileCount: files.length,
            totalBytes,
          }
        }),
      )

    const ensureParentDir = (relPath: string) =>
      Effect.gen(function* () {
        const parent = parentDirOf(relPath)
        if (parent !== undefined) {
          yield* fs
            .makeDirectory(toMountPath(parent), { recursive: true })
            .pipe(Effect.mapError(mapIoError))
        }
      })

    const writeInternal = (
      rawPath: string,
      content: string,
      mode: "create" | "upsert",
    ): Effect.Effect<void, WorkspaceError> =>
      lock.withPermits(1)(
        Effect.gen(function* () {
          const relPath = yield* validateFilePath(rawPath)
          const fileBytes = utf8ByteLength(content)
          if (fileBytes > maxFileBytes) {
            return yield* Effect.fail(
              new WorkspaceError({
                code: "file-too-large",
                message: `File "${relPath}" exceeds the ${Math.round(maxFileBytes / 1024)} KiB limit.`,
              }),
            )
          }

          const fsPath = toMountPath(relPath)
          const alreadyExists = yield* fs
            .exists(fsPath)
            .pipe(Effect.mapError(mapIoError))

          if (mode === "create" && alreadyExists) {
            return yield* Effect.fail(
              new WorkspaceError({
                code: "already-exists",
                message: `"${relPath}" already exists.`,
              }),
            )
          }

          let previousBytes = 0
          if (alreadyExists) {
            const info = yield* fs
              .stat(fsPath)
              .pipe(Effect.mapError(mapIoError))
            if (info.type === "Directory") {
              return yield* Effect.fail(
                new WorkspaceError({
                  code: "already-exists",
                  message: `A directory already exists at "${relPath}".`,
                }),
              )
            }
            const prevContent = yield* fs
              .readFileString(fsPath)
              .pipe(Effect.mapError(mapIoError))
            previousBytes = utf8ByteLength(prevContent)
          }

          const currentStats = yield* computeStats()
          if (!alreadyExists && currentStats.fileCount + 1 > maxFiles) {
            return yield* Effect.fail(
              new WorkspaceError({
                code: "too-many-files",
                message: `Workspace cannot exceed ${maxFiles} files.`,
              }),
            )
          }

          const nextTotalBytes =
            currentStats.totalBytes - previousBytes + fileBytes
          if (nextTotalBytes > maxTotalBytes) {
            return yield* Effect.fail(
              new WorkspaceError({
                code: "workspace-too-large",
                message: `Workspace exceeds the ${Math.round(maxTotalBytes / (1024 * 1024))} MiB total limit.`,
              }),
            )
          }

          yield* ensureParentDir(relPath)
          yield* fs
            .writeFileString(fsPath, content)
            .pipe(Effect.mapError(mapIoError))

          yield* PubSub.publish(
            pubsub,
            alreadyExists
              ? { _tag: "FileChanged", path: relPath, content }
              : { _tag: "FileCreated", path: relPath, content },
          )
        }),
      )

    if (options?.initialFiles !== undefined) {
      for (const [relPath, content] of Object.entries(options.initialFiles)) {
        yield* writeInternal(relPath, content, "upsert")
      }
    }

    const listFiles = lock.withPermits(1)(
      collectEntries("").pipe(Effect.map(({ files }) => files)),
    )

    const getTree = lock.withPermits(1)(buildTree(""))

    const stats = lock.withPermits(1)(computeStats())

    const readFile = (rawPath: string): Effect.Effect<string, WorkspaceError> =>
      lock.withPermits(1)(
        Effect.gen(function* () {
          const relPath = yield* validateFilePath(rawPath)
          const fsPath = toMountPath(relPath)
          const exists = yield* fs
            .exists(fsPath)
            .pipe(Effect.mapError(mapIoError))
          if (!exists) {
            return yield* Effect.fail(
              new WorkspaceError({
                code: "not-found",
                message: `File "${relPath}" not found.`,
              }),
            )
          }
          return yield* fs
            .readFileString(fsPath)
            .pipe(Effect.mapError(mapIoError))
        }),
      )

    const writeFile = (
      rawPath: string,
      content: string,
    ): Effect.Effect<void, WorkspaceError> =>
      writeInternal(rawPath, content, "upsert")

    const createFile = (
      rawPath: string,
      content: string = "",
    ): Effect.Effect<void, WorkspaceError> =>
      writeInternal(rawPath, content, "create")

    const createDirectory = (
      rawPath: string,
    ): Effect.Effect<void, WorkspaceError> =>
      lock.withPermits(1)(
        Effect.gen(function* () {
          const relPath = yield* normalizeRelativePath(rawPath)
          const fsPath = toMountPath(relPath)
          const exists = yield* fs
            .exists(fsPath)
            .pipe(Effect.mapError(mapIoError))
          if (exists) {
            return yield* Effect.fail(
              new WorkspaceError({
                code: "already-exists",
                message: `"${relPath}" already exists.`,
              }),
            )
          }
          yield* fs
            .makeDirectory(fsPath, { recursive: true })
            .pipe(Effect.mapError(mapIoError))
          yield* PubSub.publish(pubsub, { _tag: "DirectoryChanged" })
        }),
      )

    const rename = (
      rawOldPath: string,
      rawNewPath: string,
    ): Effect.Effect<void, WorkspaceError> =>
      lock.withPermits(1)(
        Effect.gen(function* () {
          const oldPath = yield* normalizeRelativePath(rawOldPath)
          const oldFs = toMountPath(oldPath)
          const exists = yield* fs
            .exists(oldFs)
            .pipe(Effect.mapError(mapIoError))
          if (!exists) {
            return yield* Effect.fail(
              new WorkspaceError({
                code: "not-found",
                message: `"${oldPath}" not found.`,
              }),
            )
          }

          const info = yield* fs.stat(oldFs).pipe(Effect.mapError(mapIoError))
          const newPath =
            info.type === "Directory"
              ? yield* normalizeRelativePath(rawNewPath)
              : yield* validateFilePath(rawNewPath)

          if (oldPath === newPath) {
            return
          }

          if (info.type === "Directory" && newPath.startsWith(`${oldPath}/`)) {
            return yield* Effect.fail(
              new WorkspaceError({
                code: "invalid-path",
                message: "Cannot move a folder into itself.",
              }),
            )
          }

          const newFs = toMountPath(newPath)
          const targetExists = yield* fs
            .exists(newFs)
            .pipe(Effect.mapError(mapIoError))
          if (targetExists) {
            return yield* Effect.fail(
              new WorkspaceError({
                code: "already-exists",
                message: `"${newPath}" already exists.`,
              }),
            )
          }

          if (info.type === "Directory") {
            const nestedBefore = yield* collectEntries(oldPath)
            yield* ensureParentDir(newPath)
            yield* fs.rename(oldFs, newFs).pipe(Effect.mapError(mapIoError))
            for (const entry of nestedBefore.files) {
              const suffix = entry.path.slice(oldPath.length)
              yield* PubSub.publish(pubsub, {
                _tag: "FileRenamed",
                oldPath: entry.path,
                newPath: `${newPath}${suffix}`,
                content: entry.content,
              })
            }
            yield* PubSub.publish(pubsub, { _tag: "DirectoryChanged" })
          } else {
            const content = yield* fs
              .readFileString(oldFs)
              .pipe(Effect.mapError(mapIoError))
            yield* ensureParentDir(newPath)
            yield* fs.rename(oldFs, newFs).pipe(Effect.mapError(mapIoError))
            yield* PubSub.publish(pubsub, {
              _tag: "FileRenamed",
              oldPath,
              newPath,
              content,
            })
          }
        }),
      )

    const remove = (rawPath: string): Effect.Effect<void, WorkspaceError> =>
      lock.withPermits(1)(
        Effect.gen(function* () {
          const relPath = yield* normalizeRelativePath(rawPath)
          const fsPath = toMountPath(relPath)
          const exists = yield* fs
            .exists(fsPath)
            .pipe(Effect.mapError(mapIoError))
          if (!exists) {
            return yield* Effect.fail(
              new WorkspaceError({
                code: "not-found",
                message: `"${relPath}" not found.`,
              }),
            )
          }

          const info = yield* fs.stat(fsPath).pipe(Effect.mapError(mapIoError))
          if (info.type === "Directory") {
            const nested = yield* collectEntries(relPath)
            yield* fs
              .remove(fsPath, { recursive: true })
              .pipe(Effect.mapError(mapIoError))
            for (const entry of nested.files) {
              yield* PubSub.publish(pubsub, {
                _tag: "FileDeleted",
                path: entry.path,
              })
            }
            yield* PubSub.publish(pubsub, { _tag: "DirectoryChanged" })
          } else {
            yield* fs.remove(fsPath).pipe(Effect.mapError(mapIoError))
            yield* PubSub.publish(pubsub, {
              _tag: "FileDeleted",
              path: relPath,
            })
          }
        }),
      )

    const snapshot = lock.withPermits(1)(
      collectEntries("").pipe(
        Effect.map(({ files, directories }) => {
          const fileRecord: Record<string, string> = {}
          for (const f of files) {
            fileRecord[f.path] = f.content
          }
          const emptyDirs = directories.filter(
            (dir) => !files.some((f) => f.path.startsWith(`${dir}/`)),
          )
          return {
            version: 1 as const,
            files: fileRecord,
            ...(emptyDirs.length > 0 ? { directories: emptyDirs } : {}),
          }
        }),
      ),
    )

    const restoreSnapshot = (
      snap: WorkspaceSnapshot,
    ): Effect.Effect<void, WorkspaceError> =>
      lock.withPermits(1)(
        Effect.gen(function* () {
          // Validate all files & limits before mutating
          const entries = Object.entries(snap.files)
          if (entries.length > maxFiles) {
            return yield* Effect.fail(
              new WorkspaceError({
                code: "too-many-files",
                message: `Snapshot exceeds ${maxFiles} files.`,
              }),
            )
          }
          let totalBytes = 0
          const validatedFiles: Array<WorkspaceFileEntry> = []
          for (const [rawPath, content] of entries) {
            const relPath = yield* validateFilePath(rawPath)
            const bytes = utf8ByteLength(content)
            if (bytes > maxFileBytes) {
              return yield* Effect.fail(
                new WorkspaceError({
                  code: "file-too-large",
                  message: `File "${relPath}" exceeds per-file limit.`,
                }),
              )
            }
            totalBytes += bytes
            validatedFiles.push({ path: relPath, content })
          }
          if (totalBytes > maxTotalBytes) {
            return yield* Effect.fail(
              new WorkspaceError({
                code: "workspace-too-large",
                message: "Snapshot exceeds total workspace size limit.",
              }),
            )
          }

          const validatedDirs: Array<string> = []
          for (const rawDir of snap.directories ?? []) {
            validatedDirs.push(yield* normalizeRelativePath(rawDir))
          }

          const previous = yield* collectEntries("")
          yield* fs
            .remove(WORKSPACE_MOUNT_ROOT, { recursive: true, force: true })
            .pipe(Effect.mapError(mapIoError))
          yield* fs
            .makeDirectory(WORKSPACE_MOUNT_ROOT, { recursive: true })
            .pipe(Effect.mapError(mapIoError))

          for (const prev of previous.files) {
            yield* PubSub.publish(pubsub, {
              _tag: "FileDeleted",
              path: prev.path,
            })
          }

          for (const dir of validatedDirs) {
            yield* fs
              .makeDirectory(toMountPath(dir), { recursive: true })
              .pipe(Effect.mapError(mapIoError))
          }

          for (const file of validatedFiles) {
            yield* ensureParentDir(file.path)
            yield* fs
              .writeFileString(toMountPath(file.path), file.content)
              .pipe(Effect.mapError(mapIoError))
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
      stats,
      readFile,
      writeFile,
      createFile,
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
  Layer.effect(Workspace, makeWorkspaceFromFileSystem(options)).pipe(
    Layer.provide(makeMemoryFileSystemLayer()),
  )
