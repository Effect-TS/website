import type { JSONOutput } from "typedoc"
import { z } from "astro/zod"

export const ApiReferenceEntry = z.object({
  version: z.string().regex(/^v\d+$/),
  revision: z.string().min(1),
  packageName: z.string().min(1),
  packageSlug: z.string().min(1),
  packageVersion: z.string().min(1),
  packageDescription: z.string().min(1),
  packageModuleCount: z.number().int().nonnegative(),
  packageNpmUrl: z.string().url(),
  packageSourceUrl: z.string().url(),
  modulePath: z.string().min(1),
  barrelPath: z.string().min(1).optional(),
  exportPath: z.string().min(1),
  sourcePath: z.string().min(1),
  reflectionPath: z.string().min(1),
  reflectionDigest: z.string().regex(/^[a-f0-9]{64}$/),
  typedocSchemaVersion: z.literal("2.0"),
})

export type ApiReferenceEntry = z.infer<typeof ApiReferenceEntry>

export const TypeDocProjectReflection = z.custom<JSONOutput.ProjectReflection>(
  (value) =>
    typeof value === "object" &&
    value !== null &&
    "schemaVersion" in value &&
    value.schemaVersion === "2.0" &&
    "variant" in value &&
    value.variant === "project" &&
    "id" in value &&
    typeof value.id === "number" &&
    "name" in value &&
    typeof value.name === "string" &&
    "kind" in value &&
    typeof value.kind === "number" &&
    "flags" in value &&
    typeof value.flags === "object" &&
    value.flags !== null,
  "Invalid TypeDoc project reflection",
)

export type TypeDocProjectReflection = JSONOutput.ProjectReflection

export const ApiReferenceDatasetManifest = z.object({
  datasetSchemaVersion: z.literal(1),
  channel: z.string().regex(/^v\d+$/),
  typedocVersion: z.string().min(1),
  typedocSchemaVersion: z.literal("2.0"),
  revision: z.string().min(1),
  packages: z.array(
    z.object({
      name: z.string().min(1),
      version: z.string().min(1),
      manifest: z.string().min(1),
    }),
  ),
})

export const ApiReferencePackageManifest = z.object({
  schemaVersion: z.literal(3),
  channel: z.string().regex(/^v\d+$/),
  name: z.string().min(1),
  version: z.string().min(1),
  revision: z.string().min(1),
  description: z.string().min(1),
  npmUrl: z.string().url(),
  sourceUrl: z.string().url(),
  barrels: z.array(
    z.object({
      export: z.string().min(1),
      source: z.string().min(1),
    }),
  ),
  modules: z.array(
    z.object({
      export: z.string().min(1),
      source: z.string().min(1),
      json: z.string().min(1),
      sha256: z.string().regex(/^[a-f0-9]{64}$/),
      barrel: z.string().min(1).optional(),
    }),
  ),
})
