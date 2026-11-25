import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import {
  copyFile,
  lstat,
  mkdir,
  readdir,
  readFile,
  realpath,
  rm,
  writeFile,
} from "node:fs/promises"
import path from "node:path"

export const PREVIEW_ARTIFACT_VERSION = 1
export const PREVIEW_MANIFEST_FILE = "manifest.json"
export const PREVIEW_SERVER_DIR = "server"
export const PREVIEW_CLIENT_DIR = "client"
export const PREVIEW_MIGRATIONS_DIR = "migrations"
export const DEFAULT_PREVIEW_ARTIFACT_DIR = ".requested-preview-artifact"

const ALLOWED_TOP_LEVEL_ENTRIES = new Set([
  PREVIEW_MANIFEST_FILE,
  PREVIEW_SERVER_DIR,
  PREVIEW_CLIENT_DIR,
  PREVIEW_MIGRATIONS_DIR,
])

export class PreviewArtifactError extends Data.TaggedError(
  "PreviewArtifactError",
)<{
  readonly message: string
}> {}

export interface PreviewArtifactManifest {
  readonly version: typeof PREVIEW_ARTIFACT_VERSION
  readonly entry: string
}

export interface PreviewServerModule {
  readonly name: string
  readonly content: string | Uint8Array
}

export interface ValidatedPreviewArtifact {
  readonly rootDir: string
  readonly serverDir: string
  readonly entryFile: string
  readonly entryName: string
  readonly clientDir: string
  readonly migrationsDir: string | undefined
  readonly serverModules: ReadonlyArray<string>
  readonly clientFiles: ReadonlyArray<string>
  readonly migrationFiles: ReadonlyArray<string>
}

export interface WritePreviewArtifactOptions {
  readonly outputDir: string
  readonly serverModules: ReadonlyArray<PreviewServerModule>
  readonly clientDir: string
  readonly migrationsDir?: string | undefined
}

const failArtifact = (message: string) =>
  Effect.fail(new PreviewArtifactError({ message }))

const isWithin = (root: string, candidate: string): boolean => {
  const relative = path.relative(root, candidate)
  return (
    relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative)
  )
}

const isSafeRelativePosixPath = (value: string): boolean => {
  if (
    value.length === 0 ||
    value.includes("\0") ||
    value.includes("\\") ||
    value.startsWith("/") ||
    value.endsWith("/")
  ) {
    return false
  }
  const segments = value.split("/")
  return segments.every(
    (segment) => segment.length > 0 && segment !== "." && segment !== "..",
  )
}

const validateEntryName = (
  entry: unknown,
): Effect.Effect<string, PreviewArtifactError> => {
  if (typeof entry !== "string" || !isSafeRelativePosixPath(entry)) {
    return failArtifact(
      `Invalid preview manifest entry: expected a safe relative POSIX path, received ${JSON.stringify(entry)}`,
    )
  }
  if (entry.includes("/")) {
    return failArtifact(
      `Invalid preview manifest entry "${entry}": entry module must be a top-level file in ${PREVIEW_SERVER_DIR}/`,
    )
  }
  if (!/\.m?js$/.test(entry)) {
    return failArtifact(
      `Invalid preview manifest entry "${entry}": entry module must end with .js or .mjs`,
    )
  }
  return Effect.succeed(entry)
}

const fsTry = <A>(
  operation: () => Promise<A>,
  message: string,
): Effect.Effect<A, PreviewArtifactError> =>
  Effect.tryPromise({
    try: operation,
    catch: (cause) =>
      new PreviewArtifactError({
        message: `${message}: ${cause instanceof Error ? cause.message : String(cause)}`,
      }),
  })

const assertRegularDirectory = (
  dirPath: string,
  expectedRoot?: string,
): Effect.Effect<string, PreviewArtifactError> =>
  Effect.gen(function* () {
    const stats = yield* fsTry(
      () => lstat(dirPath),
      `Missing required directory "${dirPath}"`,
    )
    if (stats.isSymbolicLink() || !stats.isDirectory()) {
      return yield* failArtifact(
        `Expected "${dirPath}" to be a regular directory (symlinks are forbidden)`,
      )
    }
    const real = yield* fsTry(
      () => realpath(dirPath),
      `Failed to resolve directory "${dirPath}"`,
    )
    if (expectedRoot !== undefined && !isWithin(expectedRoot, real)) {
      return yield* failArtifact(
        `Directory "${dirPath}" resolves outside "${expectedRoot}"`,
      )
    }
    return real
  })

const walkStrictDirectory = (
  rootRealDir: string,
  dirRealPath: string,
): Effect.Effect<ReadonlyArray<string>, PreviewArtifactError> =>
  Effect.gen(function* () {
    const files: Array<string> = []
    const walk = (
      relativeDir: string,
    ): Effect.Effect<void, PreviewArtifactError> =>
      Effect.gen(function* () {
        const currentDir =
          relativeDir === "" ? dirRealPath : path.join(dirRealPath, relativeDir)
        const entries = yield* fsTry(
          () => readdir(currentDir),
          `Failed to read directory "${currentDir}"`,
        )
        for (const name of [...entries].sort()) {
          if (name.includes("\0") || name === "." || name === "..") {
            return yield* failArtifact(`Illegal path entry "${name}"`)
          }
          const relPath = relativeDir === "" ? name : `${relativeDir}/${name}`
          const fullPath = path.join(currentDir, name)
          const stats = yield* fsTry(
            () => lstat(fullPath),
            `Failed to stat "${relPath}"`,
          )
          if (stats.isSymbolicLink()) {
            return yield* failArtifact(
              `Symlinks are forbidden in preview artifacts: "${relPath}"`,
            )
          }
          const resolved = yield* fsTry(
            () => realpath(fullPath),
            `Failed to resolve "${relPath}"`,
          )
          if (!isWithin(rootRealDir, resolved)) {
            return yield* failArtifact(
              `Path "${relPath}" resolves outside artifact root`,
            )
          }
          if (stats.isDirectory()) {
            yield* walk(relPath)
            continue
          }
          if (!stats.isFile()) {
            return yield* failArtifact(
              `Unsupported non-regular file in preview artifact: "${relPath}"`,
            )
          }
          files.push(relPath)
        }
      })
    yield* walk("")
    return files.sort()
  })

const copyRegularTree = (
  sourceDir: string,
  targetDir: string,
): Effect.Effect<void, PreviewArtifactError> =>
  Effect.gen(function* () {
    const sourceReal = yield* assertRegularDirectory(sourceDir)
    const files = yield* walkStrictDirectory(sourceReal, sourceReal)
    yield* fsTry(
      () => mkdir(targetDir, { recursive: true }),
      `Failed to create directory "${targetDir}"`,
    )
    for (const relPath of files) {
      const destination = path.join(targetDir, ...relPath.split("/"))
      yield* fsTry(
        () => mkdir(path.dirname(destination), { recursive: true }),
        `Failed to create parent directory for "${relPath}"`,
      )
      yield* fsTry(
        () =>
          copyFile(path.join(sourceReal, ...relPath.split("/")), destination),
        `Failed to copy "${relPath}"`,
      )
    }
  })

export const writePreviewArtifact = (
  options: WritePreviewArtifactOptions,
): Effect.Effect<ValidatedPreviewArtifact, PreviewArtifactError> =>
  Effect.gen(function* () {
    if (options.serverModules.length === 0) {
      return yield* failArtifact(
        "Astro build produced no server modules to package",
      )
    }

    const entryModule = options.serverModules[0]
    if (entryModule === undefined) {
      return yield* failArtifact("Missing server entry module")
    }
    if (!isSafeRelativePosixPath(entryModule.name)) {
      return yield* failArtifact(
        `Unsafe server entry module path "${entryModule.name}"`,
      )
    }
    // Framework collectors emit server modules relative to `dist/` (e.g.
    // `server/entry.mjs` + `server/chunks/...`). Strip the shared entry
    // directory prefix so the entry sits directly inside `server/` where
    // Alchemy's Prebuilt source provider walks all sibling modules.
    const entryDir = path.posix.dirname(entryModule.name)
    const stripPrefix = entryDir === "." ? "" : `${entryDir}/`
    const normalizedModules: Array<PreviewServerModule> = []
    for (const module of options.serverModules) {
      if (!isSafeRelativePosixPath(module.name)) {
        return yield* failArtifact(`Unsafe server module path "${module.name}"`)
      }
      if (stripPrefix !== "" && !module.name.startsWith(stripPrefix)) {
        return yield* failArtifact(
          `Server module "${module.name}" lies outside entry directory "${entryDir}/"`,
        )
      }
      normalizedModules.push({
        name:
          stripPrefix === ""
            ? module.name
            : module.name.slice(stripPrefix.length),
        content: module.content,
      })
    }

    const entryName = yield* validateEntryName(normalizedModules[0]?.name)

    const outputDir = path.resolve(options.outputDir)
    yield* fsTry(
      () => rm(outputDir, { recursive: true, force: true }),
      `Failed to clean artifact directory "${outputDir}"`,
    )
    const serverDir = path.join(outputDir, PREVIEW_SERVER_DIR)
    const clientDir = path.join(outputDir, PREVIEW_CLIENT_DIR)
    yield* fsTry(
      () => mkdir(serverDir, { recursive: true }),
      `Failed to create server output directory "${serverDir}"`,
    )

    const seenModules = new Set<string>()
    for (const module of normalizedModules) {
      if (!isSafeRelativePosixPath(module.name)) {
        return yield* failArtifact(`Unsafe server module path "${module.name}"`)
      }
      if (seenModules.has(module.name)) {
        return yield* failArtifact(
          `Duplicate server module path "${module.name}"`,
        )
      }
      seenModules.add(module.name)
      const destination = path.join(serverDir, ...module.name.split("/"))
      if (!isWithin(serverDir, destination)) {
        return yield* failArtifact(
          `Server module path "${module.name}" escapes server directory`,
        )
      }
      yield* fsTry(
        () => mkdir(path.dirname(destination), { recursive: true }),
        `Failed to create directory for module "${module.name}"`,
      )
      yield* fsTry(
        () => writeFile(destination, module.content),
        `Failed to write server module "${module.name}"`,
      )
    }

    yield* copyRegularTree(options.clientDir, clientDir)

    if (options.migrationsDir !== undefined) {
      const migrationsSource = path.resolve(options.migrationsDir)
      const migrationsStat = yield* Effect.tryPromise({
        try: () => lstat(migrationsSource),
        catch: () => undefined,
      }).pipe(Effect.orElseSucceed(() => undefined))
      if (migrationsStat !== undefined) {
        const migrationsReal = yield* assertRegularDirectory(migrationsSource)
        const migrationFiles = yield* walkStrictDirectory(
          migrationsReal,
          migrationsReal,
        )
        const targetMigrationsDir = path.join(outputDir, PREVIEW_MIGRATIONS_DIR)
        yield* fsTry(
          () => mkdir(targetMigrationsDir, { recursive: true }),
          `Failed to create migrations directory "${targetMigrationsDir}"`,
        )
        for (const relPath of migrationFiles) {
          if (relPath.includes("/") || !relPath.endsWith(".sql")) {
            return yield* failArtifact(
              `Unexpected file in migrations directory: "${relPath}"`,
            )
          }
          yield* fsTry(
            () =>
              copyFile(
                path.join(migrationsReal, relPath),
                path.join(targetMigrationsDir, relPath),
              ),
            `Failed to copy migration "${relPath}"`,
          )
        }
      }
    }

    const manifest: PreviewArtifactManifest = {
      version: PREVIEW_ARTIFACT_VERSION,
      entry: entryName,
    }
    yield* fsTry(
      () =>
        writeFile(
          path.join(outputDir, PREVIEW_MANIFEST_FILE),
          `${JSON.stringify(manifest, null, 2)}\n`,
        ),
      "Failed to write preview manifest",
    )

    return yield* validatePreviewArtifact(outputDir)
  })

export const validatePreviewArtifact = (
  artifactDir: string,
): Effect.Effect<ValidatedPreviewArtifact, PreviewArtifactError> =>
  Effect.gen(function* () {
    const rootDir = yield* assertRegularDirectory(path.resolve(artifactDir))
    const topLevelEntries = yield* fsTry(
      () => readdir(rootDir),
      `Failed to list artifact directory "${rootDir}"`,
    )

    for (const entry of topLevelEntries) {
      if (!ALLOWED_TOP_LEVEL_ENTRIES.has(entry)) {
        return yield* failArtifact(
          `Unexpected top-level entry in preview artifact: "${entry}"`,
        )
      }
    }

    const manifestPath = path.join(rootDir, PREVIEW_MANIFEST_FILE)
    const manifestStat = yield* fsTry(
      () => lstat(manifestPath),
      `Missing ${PREVIEW_MANIFEST_FILE} in preview artifact`,
    )
    if (manifestStat.isSymbolicLink() || !manifestStat.isFile()) {
      return yield* failArtifact(
        `${PREVIEW_MANIFEST_FILE} must be a regular file`,
      )
    }
    const manifestReal = yield* fsTry(
      () => realpath(manifestPath),
      `Failed to resolve ${PREVIEW_MANIFEST_FILE}`,
    )
    if (!isWithin(rootDir, manifestReal)) {
      return yield* failArtifact(
        `${PREVIEW_MANIFEST_FILE} resolves outside artifact root`,
      )
    }
    const manifestRaw = yield* fsTry(
      () => readFile(manifestReal, "utf8"),
      `Failed to read ${PREVIEW_MANIFEST_FILE}`,
    )
    let parsedManifest: unknown
    try {
      parsedManifest = JSON.parse(manifestRaw)
    } catch (cause) {
      return yield* failArtifact(
        `Invalid JSON in ${PREVIEW_MANIFEST_FILE}: ${cause instanceof Error ? cause.message : String(cause)}`,
      )
    }
    if (
      typeof parsedManifest !== "object" ||
      parsedManifest === null ||
      Array.isArray(parsedManifest)
    ) {
      return yield* failArtifact(`${PREVIEW_MANIFEST_FILE} must be an object`)
    }
    const manifestRecord = parsedManifest as Record<string, unknown>
    if (manifestRecord.version !== PREVIEW_ARTIFACT_VERSION) {
      return yield* failArtifact(
        `Unsupported preview manifest version: ${JSON.stringify(manifestRecord.version)}`,
      )
    }
    const entryName = yield* validateEntryName(manifestRecord.entry)

    const serverDir = yield* assertRegularDirectory(
      path.join(rootDir, PREVIEW_SERVER_DIR),
      rootDir,
    )
    const serverModules = yield* walkStrictDirectory(rootDir, serverDir)
    if (!serverModules.includes(entryName)) {
      return yield* failArtifact(
        `Preview entry module "${PREVIEW_SERVER_DIR}/${entryName}" is missing`,
      )
    }

    const clientDir = yield* assertRegularDirectory(
      path.join(rootDir, PREVIEW_CLIENT_DIR),
      rootDir,
    )
    const clientFiles = yield* walkStrictDirectory(rootDir, clientDir)
    if (clientFiles.length === 0) {
      return yield* failArtifact(
        `Preview artifact "${PREVIEW_CLIENT_DIR}/" directory is empty`,
      )
    }

    let migrationsDir: string | undefined
    let migrationFiles: ReadonlyArray<string> = []
    if (topLevelEntries.includes(PREVIEW_MIGRATIONS_DIR)) {
      migrationsDir = yield* assertRegularDirectory(
        path.join(rootDir, PREVIEW_MIGRATIONS_DIR),
        rootDir,
      )
      migrationFiles = yield* walkStrictDirectory(rootDir, migrationsDir)
      for (const file of migrationFiles) {
        if (file.includes("/") || !file.endsWith(".sql")) {
          return yield* failArtifact(
            `Migrations directory may only contain top-level .sql files, found "${file}"`,
          )
        }
      }
    }

    return {
      rootDir,
      serverDir,
      entryFile: path.join(serverDir, entryName),
      entryName,
      clientDir,
      migrationsDir,
      serverModules,
      clientFiles,
      migrationFiles,
    }
  })
