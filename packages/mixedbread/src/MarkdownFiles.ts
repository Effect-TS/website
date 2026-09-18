import { toFile } from "@mixedbread/sdk"
import * as Effect from "effect/Effect"
import * as FileSystem from "effect/FileSystem"
import * as Path from "effect/Path"
import type { LocalFile } from "./ApiReferenceFiles.ts"
import * as Blog from "./Blog.ts"
import { BLOG_CONTENT_PATTERNS } from "./Config.ts"
import * as Documentation from "./Documentation.ts"
import { UnknownError } from "./Error.ts"

type Stager = (
  source: string,
  relativePath: string,
) => { readonly source: string } | undefined

const buildFiles = Effect.fn("MarkdownFiles.build")(function* (options: {
  readonly filePaths: ReadonlyArray<string>
  readonly contentDir: string
  readonly contentSource: string
  readonly externalIdPrefix: string
  readonly stage: Stager
  readonly hash: (bytes: Uint8Array) => Effect.Effect<string, UnknownError>
}) {
  const fs = yield* FileSystem.FileSystem
  const path = yield* Path.Path
  const encoder = new TextEncoder()
  const files = yield* Effect.forEach(
    options.filePaths,
    Effect.fnUntraced(function* (filePath) {
      const source = yield* fs
        .readFileString(filePath)
        .pipe(Effect.mapError((cause) => new UnknownError({ cause })))
      const relativePath = path
        .relative(options.contentDir, filePath)
        .replace(/\\/g, "/")
      const staged = yield* Effect.try({
        try: () => options.stage(source, relativePath),
        catch: (cause) => new UnknownError({ cause }),
      })
      if (staged === undefined) return undefined
      const bytes = encoder.encode(staged.source)
      const fileHash = yield* options.hash(bytes)
      const file: LocalFile = {
        externalId: `${options.externalIdPrefix}${relativePath}`,
        fileHash,
        metadata: {
          content_source: options.contentSource,
          file_path: relativePath,
        },
        upload: () =>
          toFile(bytes, relativePath.replace(/\//g, "__"), {
            type: "text/markdown",
          }),
      }
      return file
    }),
    { concurrency: "unbounded" },
  )
  return files.filter((file): file is LocalFile => file !== undefined)
})

export const generateDocumentationFiles = Effect.fn(
  "MarkdownFiles.generateDocumentation",
)(function* (
  contentDir: string,
  hash: (bytes: Uint8Array) => Effect.Effect<string, UnknownError>,
) {
  const fs = yield* FileSystem.FileSystem
  const filePaths = yield* fs
    .glob(`${contentDir}/**/*.{md,mdx}`)
    .pipe(Effect.mapError((cause) => new UnknownError({ cause })))
  return yield* buildFiles({
    filePaths,
    contentDir,
    contentSource: "documentation",
    externalIdPrefix: "documentation/",
    stage: Documentation.stageDocument,
    hash,
  })
})

export const generateBlogFiles = Effect.fn("MarkdownFiles.generateBlog")(
  function* (
    contentDir: string,
    hash: (bytes: Uint8Array) => Effect.Effect<string, UnknownError>,
  ) {
    const fs = yield* FileSystem.FileSystem
    const nested = yield* Effect.forEach(
      BLOG_CONTENT_PATTERNS,
      (pattern) =>
        fs
          .glob(`${contentDir}/${pattern}`)
          .pipe(Effect.mapError((cause) => new UnknownError({ cause }))),
      { concurrency: "unbounded" },
    )
    const filePaths = [...new Set(nested.flat())]
    return yield* buildFiles({
      filePaths,
      contentDir,
      contentSource: "blog",
      externalIdPrefix: "blog/",
      stage: Blog.stageBlogPost,
      hash,
    })
  },
)
