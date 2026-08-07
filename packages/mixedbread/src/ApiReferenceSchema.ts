import type { JSONOutput } from "typedoc"
import * as Schema from "effect/Schema"

const Version = Schema.String.check(Schema.isPattern(/^v\d+$/))
const Digest = Schema.String.check(Schema.isPattern(/^[a-f0-9]{64}$/))
const UrlString = Schema.String.check(
  Schema.makeFilter((value: string) => URL.canParse(value), {
    expected: "a URL",
  }),
)

export const ApiReferenceEntry = Schema.Struct({
  version: Version,
  revision: Schema.NonEmptyString,
  packageName: Schema.NonEmptyString,
  packageSlug: Schema.NonEmptyString,
  packageVersion: Schema.NonEmptyString,
  packageDescription: Schema.NonEmptyString,
  packageModuleCount: Schema.Number.check(
    Schema.isInt(),
    Schema.isGreaterThanOrEqualTo(0),
  ),
  packageNpmUrl: UrlString,
  packageSourceUrl: UrlString,
  modulePath: Schema.NonEmptyString,
  barrelPath: Schema.optional(Schema.NonEmptyString),
  exportPath: Schema.NonEmptyString,
  sourcePath: Schema.NonEmptyString,
  reflectionPath: Schema.NonEmptyString,
  reflectionDigest: Digest,
  typedocSchemaVersion: Schema.Literal("2.0"),
})

export type ApiReferenceEntry = typeof ApiReferenceEntry.Type

export const TypeDocProjectReflection =
  Schema.declare<JSONOutput.ProjectReflection>(
    (value): value is JSONOutput.ProjectReflection =>
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
    { expected: "a TypeDoc project reflection" },
  )

export type TypeDocProjectReflection = JSONOutput.ProjectReflection

export const ApiReferenceDatasetManifest = Schema.Struct({
  datasetSchemaVersion: Schema.Literal(1),
  channel: Version,
  typedocVersion: Schema.NonEmptyString,
  typedocSchemaVersion: Schema.Literal("2.0"),
  revision: Schema.NonEmptyString,
  packages: Schema.Array(
    Schema.Struct({
      name: Schema.NonEmptyString,
      version: Schema.NonEmptyString,
      manifest: Schema.NonEmptyString,
    }),
  ),
})

export const ApiReferencePackageManifest = Schema.Struct({
  schemaVersion: Schema.Literal(3),
  channel: Version,
  name: Schema.NonEmptyString,
  version: Schema.NonEmptyString,
  revision: Schema.NonEmptyString,
  description: Schema.NonEmptyString,
  npmUrl: UrlString,
  sourceUrl: UrlString,
  barrels: Schema.Array(
    Schema.Struct({
      export: Schema.NonEmptyString,
      source: Schema.NonEmptyString,
    }),
  ),
  modules: Schema.Array(
    Schema.Struct({
      export: Schema.NonEmptyString,
      source: Schema.NonEmptyString,
      json: Schema.NonEmptyString,
      sha256: Digest,
      barrel: Schema.optional(Schema.NonEmptyString),
    }),
  ),
})
