import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import { existsSync } from "node:fs"
import {
  cp,
  mkdir,
  readdir,
  readFile,
  realpath,
  rm,
  writeFile,
} from "node:fs/promises"
import path from "node:path"

export const DEFAULT_PREVIEW_ARTIFACT_DIR = ".requested-preview-artifact"

// The build job runs the PR branch's writer and the publish job runs main's
// validator, so the two can disagree about the layout. Bump this when it changes.
const ARTIFACT_VERSION = 1
const MANIFEST_FILE = "manifest.json"
const SERVER_DIR = "server"
const CLIENT_DIR = "client"
const MIGRATIONS_DIR = "migrations"
const TOP_LEVEL_ENTRIES = new Set([
  MANIFEST_FILE,
  SERVER_DIR,
  CLIENT_DIR,
  MIGRATIONS_DIR,
])

// The entry module sits directly inside `server/`.
const ENTRY_NAME = /^[^/\\\0]+\.m?js$/
const MIGRATION_FILE = /^migrations\/[^/]+\.sql$/

export class PreviewArtifactError extends Data.TaggedError(
  "PreviewArtifactError",
)<{
  readonly message: string
}> {}

export interface PreviewServerModule {
  readonly name: string
  readonly content: string | Uint8Array
}

export interface ValidatedPreviewArtifact {
  readonly rootDir: string
  readonly serverDir: string
  readonly entryFile: string
  readonly clientDir: string
  readonly migrationsDir: string | undefined
}

export interface WritePreviewArtifactOptions {
  readonly outputDir: string
  // Entry module first, as Alchemy's framework builds return them.
  readonly serverModules: ReadonlyArray<PreviewServerModule>
  readonly clientDir: string
  // Skipped when the directory does not exist.
  readonly migrationsDir: string
}

const failArtifact = (message: string) =>
  Effect.fail(new PreviewArtifactError({ message }))

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

// Runs in the build job, next to contributor code. Nothing here is a security
// check: the publish job trusts only `validatePreviewArtifact`. Validating at
// the end makes a bad artifact fail the build instead of the publish.
export const writePreviewArtifact = (
  options: WritePreviewArtifactOptions,
): Effect.Effect<ValidatedPreviewArtifact, PreviewArtifactError> =>
  Effect.gen(function* () {
    const entry = options.serverModules[0]
    if (entry === undefined) {
      return yield* failArtifact(
        "Astro build produced no server modules to package",
      )
    }
    // Framework builds name server modules relative to `dist/`, for example
    // `server/entry.mjs` and `server/chunks/...`. Strip the entry's directory
    // so the entry sits directly inside `server/`, where Alchemy's prebuilt
    // source walks its sibling modules.
    const entryDir = path.posix.dirname(entry.name)
    const prefix = entryDir === "." ? "" : `${entryDir}/`
    const outputDir = path.resolve(options.outputDir)

    yield* fsTry(async () => {
      await rm(outputDir, { recursive: true, force: true })
      for (const module of options.serverModules) {
        if (!module.name.startsWith(prefix)) {
          throw new Error(
            `Server module "${module.name}" lies outside entry directory "${entryDir}/"`,
          )
        }
        const destination = path.join(
          outputDir,
          SERVER_DIR,
          module.name.slice(prefix.length),
        )
        await mkdir(path.dirname(destination), { recursive: true })
        await writeFile(destination, module.content)
      }
      await cp(options.clientDir, path.join(outputDir, CLIENT_DIR), {
        recursive: true,
      })
      if (existsSync(options.migrationsDir)) {
        await cp(options.migrationsDir, path.join(outputDir, MIGRATIONS_DIR), {
          recursive: true,
        })
      }
      await writeFile(
        path.join(outputDir, MANIFEST_FILE),
        `${JSON.stringify({ version: ARTIFACT_VERSION, entry: entry.name.slice(prefix.length) })}\n`,
      )
    }, `Failed to write preview artifact "${outputDir}"`)

    return yield* validatePreviewArtifact(outputDir)
  })

// The publish job's only check on what the build job produced. Alchemy reads
// every path below from a process that holds the Cloudflare token, so the
// artifact may contain nothing but regular files and directories, in the
// expected places, under names Alchemy resolves the same way this does.
export const validatePreviewArtifact = (
  artifactDir: string,
): Effect.Effect<ValidatedPreviewArtifact, PreviewArtifactError> =>
  Effect.gen(function* () {
    const rootDir = yield* fsTry(
      () => realpath(artifactDir),
      `Missing preview artifact directory "${artifactDir}"`,
    )
    // A recursive listing reports symlinks as symlinks and does not descend
    // into them, so every path it returns is really inside `rootDir`.
    const entries = yield* fsTry(
      () => readdir(rootDir, { recursive: true, withFileTypes: true }),
      `Failed to read preview artifact directory "${rootDir}"`,
    )

    const files = new Set<string>()
    let hasMigrations = false
    for (const entry of entries) {
      const segments = path
        .relative(rootDir, path.join(entry.parentPath, entry.name))
        .split(path.sep)
      const relPath = segments.join("/")
      // Alchemy turns "\\" into "/" before joining module names to the bundle
      // root, so a backslash would make it read a path this did not check.
      if (entry.name.includes("\\")) {
        return yield* failArtifact(`Illegal path entry "${relPath}"`)
      }
      if (entry.isSymbolicLink()) {
        return yield* failArtifact(
          `Symlinks are forbidden in preview artifacts: "${relPath}"`,
        )
      }
      if (!TOP_LEVEL_ENTRIES.has(segments[0] ?? "")) {
        return yield* failArtifact(
          `Unexpected top-level entry in preview artifact: "${segments[0]}"`,
        )
      }
      if (entry.isDirectory()) {
        hasMigrations ||= relPath === MIGRATIONS_DIR
        continue
      }
      // The manifest is the only file allowed at the top level.
      if (
        !entry.isFile() ||
        (segments.length === 1 && relPath !== MANIFEST_FILE)
      ) {
        return yield* failArtifact(
          `Unsupported entry in preview artifact: "${relPath}"`,
        )
      }
      files.add(relPath)
    }

    if (!files.has(MANIFEST_FILE)) {
      return yield* failArtifact(`Missing ${MANIFEST_FILE} in preview artifact`)
    }
    const manifestRaw = yield* fsTry(
      () => readFile(path.join(rootDir, MANIFEST_FILE), "utf8"),
      `Failed to read ${MANIFEST_FILE}`,
    )
    const manifest = yield* Effect.try({
      try: () => JSON.parse(manifestRaw) as unknown,
      catch: () =>
        new PreviewArtifactError({
          message: `Invalid JSON in ${MANIFEST_FILE}`,
        }),
    })
    const { version, entry: entryName } = (
      typeof manifest === "object" && manifest !== null ? manifest : {}
    ) as { readonly version?: unknown; readonly entry?: unknown }
    if (version !== ARTIFACT_VERSION) {
      return yield* failArtifact(
        `Unsupported preview manifest version: ${JSON.stringify(version)}`,
      )
    }
    if (typeof entryName !== "string" || !ENTRY_NAME.test(entryName)) {
      return yield* failArtifact(
        `Invalid preview manifest entry: expected a .js or .mjs file name inside ${SERVER_DIR}/, received ${JSON.stringify(entryName)}`,
      )
    }
    if (!files.has(`${SERVER_DIR}/${entryName}`)) {
      return yield* failArtifact(
        `Preview entry module "${SERVER_DIR}/${entryName}" is missing`,
      )
    }

    const paths = [...files]
    if (!paths.some((file) => file.startsWith(`${CLIENT_DIR}/`))) {
      return yield* failArtifact(
        `Preview artifact "${CLIENT_DIR}/" directory is empty`,
      )
    }
    const strayMigration = paths.find(
      (file) =>
        file.startsWith(`${MIGRATIONS_DIR}/`) && !MIGRATION_FILE.test(file),
    )
    if (strayMigration !== undefined) {
      return yield* failArtifact(
        `Migrations directory may only contain top-level .sql files, found "${strayMigration}"`,
      )
    }

    const serverDir = path.join(rootDir, SERVER_DIR)
    return {
      rootDir,
      serverDir,
      entryFile: path.join(serverDir, entryName),
      clientDir: path.join(rootDir, CLIENT_DIR),
      migrationsDir: hasMigrations
        ? path.join(rootDir, MIGRATIONS_DIR)
        : undefined,
    }
  })
