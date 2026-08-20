import * as NodeFileSystem from "@effect/platform-node/NodeFileSystem"
import * as NodeRuntime from "@effect/platform-node/NodeRuntime"
import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import * as FileSystem from "effect/FileSystem"
import * as Schema from "effect/Schema"
import { fileURLToPath } from "node:url"
import { parse } from "devalue"
import type { Plugin } from "vite"

const moduleId = "virtual:open-graph-metadata"
const resolvedModuleId = `\0${moduleId}`

class OpenGraphMetadataPluginError extends Data.TaggedError(
  "OpenGraphMetadataPluginError",
)<{
  readonly detail: string
  readonly cause: unknown
}> {
  override get message(): string {
    return this.detail
  }
}

const ContentStore = Schema.ReadonlyMap(Schema.String, Schema.Unknown)

const DocsCollection = Schema.ReadonlyMap(
  Schema.String,
  Schema.Struct({
    id: Schema.String,
    data: Schema.Struct({ title: Schema.String }),
  }),
)

const BlogCollection = Schema.ReadonlyMap(
  Schema.String,
  Schema.Struct({
    id: Schema.String,
    data: Schema.Struct({
      title: Schema.String,
      excerpt: Schema.String,
    }),
  }),
)

const ApiReferenceCollection = Schema.ReadonlyMap(
  Schema.String,
  Schema.Struct({
    id: Schema.String,
    data: Schema.Struct({
      version: Schema.String,
      packageSlug: Schema.String,
      packageName: Schema.String,
      modulePath: Schema.String,
    }),
  }),
)

const decodeCollection = <S extends Schema.Top>(
  store: ReadonlyMap<string, unknown>,
  collection: string,
  schema: S,
) =>
  Schema.decodeUnknownEffect(schema)(store.get(collection)).pipe(
    Effect.mapError(
      (cause) =>
        new OpenGraphMetadataPluginError({
          detail: `Astro content store contains invalid ${collection} metadata`,
          cause,
        }),
    ),
  )

const readCategory = (entryId: string): string | undefined => {
  const segments = entryId.split("/")
  return segments.length >= 3
    ? segments[1]?.replace(/-/g, " ").toUpperCase()
    : undefined
}

const loadMetadata = Effect.fn("OpenGraphMetadataPlugin.loadMetadata")(
  function* (storePath: string) {
    const fs = yield* FileSystem.FileSystem
    const serialized = yield* fs.readFileString(storePath).pipe(
      Effect.mapError(
        (cause) =>
          new OpenGraphMetadataPluginError({
            detail: `Unable to read Astro content store at ${storePath}`,
            cause,
          }),
      ),
    )
    const parsed: unknown = yield* Effect.try({
      try: () => parse(serialized),
      catch: (cause) =>
        new OpenGraphMetadataPluginError({
          detail: `Unable to parse Astro content store at ${storePath}`,
          cause,
        }),
    })
    const store = yield* Schema.decodeUnknownEffect(ContentStore)(parsed).pipe(
      Effect.mapError(
        (cause) =>
          new OpenGraphMetadataPluginError({
            detail: "Astro content store is not a map",
            cause,
          }),
      ),
    )
    const docsEntries = yield* decodeCollection(store, "docs", DocsCollection)
    const blogEntries = yield* decodeCollection(store, "blog", BlogCollection)
    const apiReferenceEntries = yield* decodeCollection(
      store,
      "apiReference",
      ApiReferenceCollection,
    )

    const docs = Object.fromEntries(
      Array.from(docsEntries.values(), (entry) => [
        entry.id,
        {
          title: entry.data.title,
          subtitle: readCategory(entry.id),
        },
      ]),
    )
    const blog = Object.fromEntries(
      Array.from(blogEntries.values(), (entry) => [
        entry.id,
        {
          title: entry.data.title,
          subtitle: entry.data.excerpt,
        },
      ]),
    )
    const apiReference = Object.fromEntries(
      Array.from(apiReferenceEntries.values()).flatMap((entry) => {
        const { modulePath, packageName, packageSlug, version } = entry.data
        const moduleName = modulePath.split("/").at(-1) ?? modulePath
        return [
          [
            `${version}/api`,
            { eyebrow: "Effect Docs", title: "API Reference" },
          ],
          [
            `${version}/api/${packageSlug}`,
            { eyebrow: "API Reference", title: packageName },
          ],
          [
            `${version}/api/${packageSlug}/${modulePath}`,
            { eyebrow: "API Reference", title: moduleName },
          ],
        ]
      }),
    )

    return `export default ${JSON.stringify({ apiReference, blog, docs })}`
  },
)

export const openGraphMetadataPlugin = (): Plugin => ({
  name: "open-graph-metadata",
  resolveId(id) {
    return id === moduleId ? resolvedModuleId : undefined
  },
  async load(id) {
    if (id !== resolvedModuleId) return undefined
    const storeUrl = new URL("../../../.astro/data-store.json", import.meta.url)
    const storePath = fileURLToPath(storeUrl)
    this.addWatchFile(storePath)
    return loadMetadata(storePath).pipe(
      Effect.provide(NodeFileSystem.layer),
      NodeRuntime.runMain,
    )
  },
})
