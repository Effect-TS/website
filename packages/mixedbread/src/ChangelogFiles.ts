import { toFile } from "@mixedbread/sdk"
import * as Effect from "effect/Effect"
import * as FileSystem from "effect/FileSystem"
import * as Path from "effect/Path"
import type { LocalFile } from "./ApiReferenceFiles.ts"
import { stageChangelogReleases } from "./Changelog.ts"
import { UnknownError } from "./Error.ts"

// Build one uploadable file per changelog release. The staged source keeps the
// search frontmatter Mixedbread reads to generate `generated_metadata.search`,
// while `metadata` carries flat, filterable fields (content_source, package_slug,
// channel) so queries can scope by package without regex over generated data.
export const generateChangelogFiles = Effect.fn("ChangelogFiles.generate")(
  function* (
    contentDir: string,
    hash: (bytes: Uint8Array) => Effect.Effect<string, UnknownError>,
  ) {
    const fs = yield* FileSystem.FileSystem
    const path = yield* Path.Path
    const contentExists = yield* fs
      .exists(contentDir)
      .pipe(Effect.mapError((cause) => new UnknownError({ cause })))
    // Changelog data is generated alongside the API reference; a sync may run
    // before it exists, so treat an absent directory as empty.
    if (!contentExists) return [] as ReadonlyArray<LocalFile>
    const filePaths = yield* fs
      .glob(`${contentDir}/**/*.md`)
      .pipe(Effect.mapError((cause) => new UnknownError({ cause })))
    const encoder = new TextEncoder()
    const files = yield* Effect.forEach(
      filePaths,
      Effect.fnUntraced(function* (filePath) {
        const source = yield* fs
          .readFileString(filePath)
          .pipe(Effect.mapError((cause) => new UnknownError({ cause })))
        const relativePath = path
          .relative(contentDir, filePath)
          .replace(/\\/g, "/")
        const documentId = relativePath.replace(/\.md$/, "")
        const releases = yield* Effect.try({
          try: () => stageChangelogReleases(source, relativePath),
          catch: (cause) => new UnknownError({ cause }),
        })
        return yield* Effect.forEach(releases, (staged) =>
          Effect.gen(function* () {
            const bytes = encoder.encode(staged.source)
            const fileHash = yield* hash(bytes)
            const file: LocalFile = {
              externalId: `changelog/${documentId}/${staged.version}`,
              fileHash,
              metadata: {
                content_source: "changelog",
                package_name: staged.metadata.package_name,
                package_slug: staged.metadata.package_slug,
                channel: staged.metadata.docs_version,
                page_href: staged.metadata.page_href,
              },
              upload: () =>
                toFile(
                  bytes,
                  `${documentId.replace(/\//g, "__")}__${staged.version}`,
                  { type: "text/markdown" },
                ),
            }
            return file
          }),
        )
      }),
      { concurrency: "unbounded" },
    )
    return files.flat()
  },
)
