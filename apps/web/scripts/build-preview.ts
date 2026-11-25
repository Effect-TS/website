import {
  getCompatibility,
  getToolingCompatibility,
} from "@alchemy.run/cloudflare/Workers/Compatibility"
import { buildInChild } from "@alchemy.run/frontend-frameworks/astro/source"
import * as NodeRuntime from "@effect/platform-node/NodeRuntime"
import * as NodeServices from "@effect/platform-node/NodeServices"
import * as Effect from "effect/Effect"
import path from "node:path"
import {
  DEFAULT_PREVIEW_ARTIFACT_DIR,
  PreviewArtifactError,
  writePreviewArtifact,
} from "../../../stacks/preview-artifact.ts"
import {
  WEBSITE_ASTRO_OPTIONS,
  WEBSITE_MIGRATIONS_DIR,
} from "../../../stacks/website-config.ts"

const repoRoot = path.resolve(import.meta.dirname, "../../..")
const outputDir = path.resolve(
  process.argv[2] ?? path.join(repoRoot, DEFAULT_PREVIEW_ARTIFACT_DIR),
)

const program = Effect.gen(function* () {
  const rootDir = path.resolve(repoRoot, WEBSITE_ASTRO_OPTIONS.rootDir)
  const migrationsDir = path.resolve(repoRoot, WEBSITE_MIGRATIONS_DIR)

  // Match Alchemy's BuildChildRunner, which runs the Astro build with
  // cwd === project root so relative config/content paths resolve identically.
  process.chdir(rootDir)

  // The compatibility settings Alchemy gives the Worker that
  // stacks/preview.ts deploys this build to.
  const compatibility = getToolingCompatibility(
    getCompatibility({ bundle: false }),
    undefined,
  )
  const buildOutput = yield* buildInChild({
    rootDir,
    main: undefined,
    compatibilityDate: compatibility.date,
    compatibilityFlags: compatibility.flags,
    env: {},
    sessionKVBindingName: undefined,
    sessions: false,
    sessionDevKV: false,
    prerenderEnvironment: WEBSITE_ASTRO_OPTIONS.prerenderEnvironment,
    astro: WEBSITE_ASTRO_OPTIONS.astro,
    config: undefined,
  })

  if (buildOutput.clientDirectory === undefined) {
    return yield* new PreviewArtifactError({
      message: "Astro build did not produce a client assets directory",
    })
  }

  const artifact = yield* writePreviewArtifact({
    outputDir,
    serverModules: buildOutput.serverModules ?? [],
    clientDir: path.resolve(rootDir, buildOutput.clientDirectory),
    migrationsDir,
  })

  yield* Effect.sync(() => {
    console.log(
      `Built preview artifact in ${artifact.rootDir} (entry ${path.basename(artifact.entryFile)})`,
    )
  })
})

program.pipe(Effect.provide(NodeServices.layer), NodeRuntime.runMain)
