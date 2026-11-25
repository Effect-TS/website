import { afterEach, assert, test, vi } from "vite-plus/test"
import * as NodeServices from "@effect/platform-node/NodeServices"
import { readPrebuiltWorkerBundle } from "@alchemy.run/cloudflare/Workers/Sources/Prebuilt"
import { AlchemyContext } from "alchemy/AlchemyContext"
import { provideFreshArtifactStore } from "alchemy/Artifacts"
import { AuthProvidersLive } from "alchemy/Auth"
import { destroy } from "alchemy/Destroy"
import { evalStack } from "alchemy/EvalStack"
import * as Interaction from "alchemy/Interaction"
import { Stage } from "alchemy/Stage"
import * as State from "alchemy/State"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises"
import { createRequire } from "node:module"
import { tmpdir } from "node:os"
import path from "node:path"
import {
  validatePreviewArtifact,
  writePreviewArtifact,
} from "../../../../stacks/preview-artifact.ts"
import EffectWebsitePreview from "../../../../stacks/preview.ts"

const requestedPreview = createRequire(import.meta.url)(
  "../../../../.github/scripts/requested-preview.cjs",
)

const tempDirs: Array<string> = []

const makeTempDir = async (prefix: string) => {
  const dir = await mkdtemp(path.join(tmpdir(), prefix))
  tempDirs.push(dir)
  return dir
}

const stageFixtureArtifact = async () => {
  const base = await makeTempDir("requested-preview-fixture-")
  const clientSrc = path.join(base, "client-src")
  const migrationsSrc = path.join(base, "migrations-src")
  const artifactDir = path.join(base, "artifact")

  await mkdir(path.join(clientSrc, "_astro"), { recursive: true })
  await mkdir(migrationsSrc, { recursive: true })
  await writeFile(path.join(clientSrc, "index.html"), "<html>ok</html>\n")
  await writeFile(path.join(clientSrc, "_astro", "font.woff"), "font-bytes")
  await writeFile(path.join(clientSrc, "_headers"), "/_astro/*\n")
  await writeFile(
    path.join(migrationsSrc, "0001_init.sql"),
    "CREATE TABLE t (id INTEGER PRIMARY KEY);\n",
  )

  return Effect.runPromise(
    writePreviewArtifact({
      outputDir: artifactDir,
      serverModules: [
        {
          name: "server/entry.mjs",
          content: 'import "./chunks/og.mjs"; export default { fetch() {} }\n',
        },
        {
          name: "server/chunks/og.mjs",
          content:
            'import wasm from "../_astro/index_bg.wasm"; export { wasm }\n',
        },
        {
          name: "server/_astro/index_bg.wasm",
          content: new Uint8Array([0x00, 0x61, 0x73, 0x6d]),
        },
      ],
      clientDir: clientSrc,
      migrationsDir: migrationsSrc,
    }),
  )
}

const evaluatePreviewStack = async (artifactDir: string, stage = "pr-1699") => {
  vi.stubEnv("PREVIEW_ARTIFACT_DIR", artifactDir)
  const dotAlchemy = await makeTempDir("requested-preview-alchemy-")
  return Effect.runPromise(
    evalStack(EffectWebsitePreview, (stack) => Effect.succeed(stack), {
      stage,
    }).pipe(
      provideFreshArtifactStore,
      Effect.provideService(AlchemyContext, {
        dotAlchemy,
        updateStateStore: false,
        dev: false,
        adopt: false,
      }),
      Effect.provideService(Stage, stage),
      Effect.provide(
        Layer.mergeAll(
          NodeServices.layer,
          AuthProvidersLive,
          State.inMemoryState(),
          Interaction.layerNonInteractive(),
        ),
      ),
    ),
  )
}

afterEach(async () => {
  vi.unstubAllEnvs()
  for (const dir of tempDirs.splice(0)) {
    await rm(dir, { recursive: true, force: true })
  }
})

test("preview artifact validation rejects symlinks, path traversal, and unexpected files", async () => {
  const fixture = await stageFixtureArtifact()
  const outsideFile = path.join(
    await makeTempDir("requested-preview-secret-"),
    "secret.txt",
  )
  await writeFile(outsideFile, "TOP_SECRET")

  // Symlink inside client assets (would exfiltrate secrets when Alchemy reads files)
  await symlink(outsideFile, path.join(fixture.clientDir, "leak.txt"))
  const symlinkError = await Effect.runPromise(
    Effect.flip(validatePreviewArtifact(fixture.rootDir)),
  )
  assert.include(symlinkError.message, "Symlinks are forbidden")
  await rm(path.join(fixture.clientDir, "leak.txt"))

  // Symlinked directory (its contents must not be walked or uploaded either)
  await symlink(path.dirname(outsideFile), path.join(fixture.serverDir, "dir"))
  const symlinkDirError = await Effect.runPromise(
    Effect.flip(validatePreviewArtifact(fixture.rootDir)),
  )
  assert.include(symlinkDirError.message, "Symlinks are forbidden")
  await rm(path.join(fixture.serverDir, "dir"))

  // Path traversal in manifest entry
  await writeFile(
    path.join(fixture.rootDir, "manifest.json"),
    JSON.stringify({ version: 1, entry: "../escape.mjs" }),
  )
  const traversalError = await Effect.runPromise(
    Effect.flip(validatePreviewArtifact(fixture.rootDir)),
  )
  assert.include(traversalError.message, "Invalid preview manifest entry")
  await writeFile(
    path.join(fixture.rootDir, "manifest.json"),
    JSON.stringify({ version: 1, entry: "entry.mjs" }),
  )

  // Backslash in ordinary POSIX filename (Alchemy normalizes "\" to "/" before joining)
  await writeFile(path.join(fixture.serverDir, "..\\escape.js"), "evil")
  const serverBackslashError = await Effect.runPromise(
    Effect.flip(validatePreviewArtifact(fixture.rootDir)),
  )
  assert.include(serverBackslashError.message, "Illegal path entry")
  await rm(path.join(fixture.serverDir, "..\\escape.js"))

  // Backslash in directory name
  await mkdir(path.join(fixture.clientDir, "sub\\dir"))
  const dirBackslashError = await Effect.runPromise(
    Effect.flip(validatePreviewArtifact(fixture.rootDir)),
  )
  assert.include(dirBackslashError.message, "Illegal path entry")
  await rm(path.join(fixture.clientDir, "sub\\dir"), { recursive: true })

  // Unexpected top-level entry
  await writeFile(path.join(fixture.rootDir, "extra.txt"), "unexpected")
  const extraError = await Effect.runPromise(
    Effect.flip(validatePreviewArtifact(fixture.rootDir)),
  )
  assert.include(extraError.message, "Unexpected top-level entry")
})

test("requested preview stack deploys prebuilt bundle without production secrets", async () => {
  const fixture = await stageFixtureArtifact()

  const bundle = await Effect.runPromise(
    readPrebuiltWorkerBundle({ main: fixture.entryFile }).pipe(
      Effect.provide(NodeServices.layer),
    ),
  )
  assert.deepEqual(
    bundle.files.map((file) => file.path),
    ["entry.mjs", "_astro/index_bg.wasm", "chunks/og.mjs"],
  )

  const stack = await evaluatePreviewStack(fixture.rootDir)
  assert.equal(stack.name, "EffectWebsitePreview")

  const worker = stack.resources["WebsiteWorker"]
  assert.isDefined(worker)
  const props = worker.Props as Record<string, unknown>
  assert.equal(props.bundle, false)
  assert.equal(props.main, fixture.entryFile)
  assert.deepEqual(props.assets, {
    directory: fixture.clientDir,
    htmlHandling: "drop-trailing-slash",
    runWorkerFirst: ["/_ingest/*"],
  })

  const envKeys = Object.keys(
    (props.env ?? {}) as Record<string, unknown>,
  ).sort()
  assert.deepEqual(envKeys, [
    "DB",
    "MOTW_VOTE_LIMIT",
    "MOTW_VOTE_SECRET",
    "TURNSTILE_SECRET",
    "TURNSTILE_SITE_KEY",
  ])
})

test("destroying a requested preview stage succeeds cleanly when no preview was ever deployed", async () => {
  vi.stubEnv("PREVIEW_ARTIFACT_DIR", "/nonexistent/requested-preview-artifact")
  const dotAlchemy = await makeTempDir("requested-preview-destroy-")

  await Effect.runPromise(
    destroy({
      stack: {
        ...EffectWebsitePreview,
        state: State.inMemoryState(),
      },
      stage: "pr-99999",
    }).pipe(
      provideFreshArtifactStore,
      Effect.provideService(AlchemyContext, {
        dotAlchemy,
        updateStateStore: false,
        dev: false,
        adopt: false,
      }),
      Effect.provideService(Stage, "pr-99999"),
      Effect.provide(
        Layer.mergeAll(
          NodeServices.layer,
          AuthProvidersLive,
          State.inMemoryState(),
          Interaction.layerNonInteractive(),
        ),
      ),
    ),
  )
})

test("a published preview deactivates the deployment it replaced, not a request that is still building", async () => {
  // Deployment 3 publishes. 1 was published earlier and 2 was requested after 3.
  const latestState: Record<number, string> = { 1: "success", 2: "in_progress" }
  const statuses: Array<[number, string]> = []
  const github = {
    paginate: async (
      list: (args: unknown) => Promise<{ data: unknown }>,
      args: unknown,
    ) => (await list(args)).data,
    rest: {
      repos: {
        listDeployments: async () => ({
          data: [1, 2, 3].map((id) => ({ id, payload: { pull_request: 7 } })),
        }),
        listDeploymentStatuses: async (args: { deployment_id: number }) => ({
          data: [{ state: latestState[args.deployment_id] }],
        }),
        createDeploymentStatus: async (args: {
          deployment_id: number
          state: string
        }) => {
          statuses.push([args.deployment_id, args.state])
        },
      },
      issues: {
        listComments: async () => ({ data: [] }),
        createComment: async () => {},
      },
    },
  }
  const context = {
    serverUrl: "https://github.com",
    repo: { owner: "Effect-TS", repo: "website" },
    runId: 1,
  }

  await requestedPreview({ github, context, core: {} }).reportPublish({
    prNumber: 7,
    headSha: "0123456789abcdef0123456789abcdef01234567",
    requester: "staff",
    deploymentId: 3,
    buildResult: "success",
    prOpen: "true",
    previewUrl: "https://preview.example.workers.dev",
  })

  assert.deepEqual(statuses, [
    [3, "success"],
    [1, "inactive"],
  ])
})
