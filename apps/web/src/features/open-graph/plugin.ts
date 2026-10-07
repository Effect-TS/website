import * as NodeFileSystem from "@effect/platform-node/NodeFileSystem"
import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import * as FileSystem from "effect/FileSystem"
import * as Schema from "effect/Schema"
import { createHash } from "node:crypto"
import { fileURLToPath } from "node:url"
import { parse } from "devalue"
import type { Plugin } from "vite"

const moduleId = "virtual:open-graph-metadata"
const resolvedModuleId = `\0${moduleId}`

const rendererVersionModuleId = "virtual:open-graph-renderer-version"
const resolvedRendererVersionModuleId = `\0${rendererVersionModuleId}`

const repositoryRoot = new URL("../../../../../", import.meta.url)

/**
 * Everything besides a page's own metadata that decides how its Open Graph
 * image looks: the renderer, its background assets, and (through the lockfile)
 * the Satori and resvg versions. Pages key the image URL on a digest of these
 * instead of the deploy revision, so an unchanged page renders byte-identical
 * HTML across commits and the incremental build can reuse it.
 */
const RENDERER_INPUTS = [
  "apps/web/src/features/open-graph",
  "apps/web/src/assets/og",
  "packages/open-graph/src",
  "pnpm-lock.yaml",
]

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
          [
            `${version}/api/${packageSlug}/changelog`,
            { eyebrow: "API Reference", title: `${packageName} changelog` },
          ],
        ]
      }),
    )

    return `export default ${JSON.stringify({ apiReference, blog, docs })}`
  },
)

const listFiles = Effect.fn("OpenGraphMetadataPlugin.listFiles")(function* (
  path: string,
) {
  const fs = yield* FileSystem.FileSystem
  const info = yield* fs.stat(path)
  if (info.type !== "Directory") return [path]
  const entries = yield* fs.readDirectory(path, { recursive: true })
  return yield* Effect.filter(
    entries.map((entry) => `${path}/${entry}`),
    (file) => fs.stat(file).pipe(Effect.map((stat) => stat.type === "File")),
  )
})

const loadRendererVersion = Effect.fn(
  "OpenGraphMetadataPlugin.loadRendererVersion",
)(function* () {
  const fs = yield* FileSystem.FileSystem
  const root = fileURLToPath(repositoryRoot)
  const files = yield* Effect.forEach(RENDERER_INPUTS, (input) =>
    listFiles(`${root}${input}`),
  ).pipe(Effect.map((groups) => groups.flat().sort()))
  const hash = createHash("sha256")
  for (const file of files) {
    hash.update(file.slice(root.length))
    hash.update("\0")
    hash.update(yield* fs.readFile(file))
    hash.update("\0")
  }
  const version = hash.digest("hex").slice(0, 16)
  return `export default ${JSON.stringify(version)}`
})

export interface OpenGraphMetadataPluginOptions {
  /**
   * Astro's resolved `cacheDir`, where the content layer writes
   * `data-store.json` during a build. Passed in from `astro.config.ts` rather
   * than hardcoded: the default is `node_modules/.astro/`, but the config
   * relocates it so CI can cache it, and a stale hardcoded path fails only on
   * a clean checkout.
   */
  readonly cacheDir: URL
}

export const openGraphMetadataPlugin = (
  options: OpenGraphMetadataPluginOptions,
): Plugin => ({
  name: "open-graph-metadata",
  resolveId(id) {
    if (id === moduleId) return resolvedModuleId
    if (id === rendererVersionModuleId) return resolvedRendererVersionModuleId
    return undefined
  },
  async load(id) {
    if (id === resolvedRendererVersionModuleId) {
      return Effect.runPromise(
        loadRendererVersion().pipe(Effect.provide(NodeFileSystem.layer)),
      )
    }
    if (id !== resolvedModuleId) return undefined
    // Dev keeps its own copy under `.astro/` and never consults `cacheDir`.
    const storeUrl =
      this.environment.mode === "build"
        ? new URL("data-store.json", options.cacheDir)
        : new URL("../../../.astro/data-store.json", import.meta.url)
    const storePath = fileURLToPath(storeUrl)
    this.addWatchFile(storePath)
    return Effect.runPromise(
      loadMetadata(storePath).pipe(Effect.provide(NodeFileSystem.layer)),
    )
  },
})
