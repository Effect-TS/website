import { z } from "astro/zod"

export const ApiReferenceEntry = z.object({
  version: z.string().regex(/^v\d+$/),
  revision: z.string().min(1),
  packageName: z.string().min(1),
  packageSlug: z.string().min(1),
  packageVersion: z.string().min(1),
  modulePath: z.string().min(1),
  exportPath: z.string().min(1),
  sourcePath: z.string().min(1),
  reflectionPath: z.string().min(1),
  reflectionDigest: z.string().regex(/^[a-f0-9]{64}$/),
  typedocSchemaVersion: z.literal("2.0"),
})

export type ApiReferenceEntry = z.infer<typeof ApiReferenceEntry>

export const TypeDocProjectReflection = z.looseObject({
  schemaVersion: z.literal("2.0"),
  id: z.number().int(),
  name: z.string(),
  kind: z.number().int(),
})

export type TypeDocProjectReflection = z.infer<typeof TypeDocProjectReflection>

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
  schemaVersion: z.literal(1),
  channel: z.string().regex(/^v\d+$/),
  name: z.string().min(1),
  version: z.string().min(1),
  revision: z.string().min(1),
  modules: z.array(
    z.object({
      export: z.string().min(1),
      source: z.string().min(1),
      json: z.string().min(1),
      sha256: z.string().regex(/^[a-f0-9]{64}$/),
    }),
  ),
})
