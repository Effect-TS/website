import * as Effect from "effect/Effect"
import path from "node:path"
import {
  DEFAULT_PREVIEW_ARTIFACT_DIR,
  validatePreviewArtifact,
} from "./preview-artifact.ts"

const artifactDir = path.resolve(
  process.argv[2] ??
    process.env.PREVIEW_ARTIFACT_DIR ??
    DEFAULT_PREVIEW_ARTIFACT_DIR,
)

const artifact = await Effect.runPromise(validatePreviewArtifact(artifactDir))
console.log(
  `Validated preview artifact in ${artifact.rootDir} (entry: ${artifact.entryName}, ${artifact.serverModules.length} server modules, ${artifact.clientFiles.length} client assets, ${artifact.migrationFiles.length} migrations)`,
)
