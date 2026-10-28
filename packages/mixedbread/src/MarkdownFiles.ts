import * as Effect from "effect/Effect"
import * as FileSystem from "effect/FileSystem"
import * as Path from "effect/Path"
import { blogPage } from "./Blog.ts"
import { chunkFiles, type LocalFile } from "./ChunkFiles.ts"
import { BLOG_CONTENT_PATTERNS } from "./Config.ts"
import { documentationPage } from "./Documentation.ts"
import { UnknownError } from "./Error.ts"

type Hash = (bytes: Uint8Array) => Effect.Effect<string, UnknownError>

const readFile = Effect.fn("MarkdownFiles.read")(function* (filePath: string) {
  const fs = yield* FileSystem.FileSystem
  return yield* fs
    .readFileString(filePath)
    .pipe(Effect.mapError((cause) => new UnknownError({ cause })))
})

/** One upload per documentation page, id `documentation/<path>-001.mxjson`. */
export const generateDocumentationFiles = Effect.fn(
  "MarkdownFiles.generateDocumentation",
)(function* (contentDir: string, hash: Hash) {
  const fs = yield* FileSystem.FileSystem
  const path = yield* Path.Path
  const filePaths = yield* fs
    .glob(`${contentDir}/**/*.{md,mdx}`)
    .pipe(Effect.mapError((cause) => new UnknownError({ cause })))
  const files = yield* Effect.forEach(
    filePaths,
    Effect.fnUntraced(function* (filePath) {
      const source = yield* readFile(filePath)
      const page = yield* Effect.try({
        try: () =>
          documentationPage(source, path.relative(contentDir, filePath)),
        catch: (cause) => new UnknownError({ cause }),
      })
      if (page === undefined) return []
      return yield* chunkFiles({
        chunks: page.chunks,
        directory: page.directory,
        name: page.name,
        metadata: {
          content_source: "documentation",
          docs_version: page.version,
        },
        hash,
      })
    }),
    { concurrency: 10 },
  )
  if (files.length === 0) {
    return yield* new UnknownError({
      cause: new Error("No documentation files to index"),
    })
  }
  yield* Effect.log(`Prepared ${files.length} documentation files`)
  return files.flat() satisfies ReadonlyArray<LocalFile>
})

/** One upload per blog post, id `blog/<id>-001.mxjson`. */
export const generateBlogFiles = Effect.fn("MarkdownFiles.generateBlog")(
  function* (contentDir: string, hash: Hash) {
    const fs = yield* FileSystem.FileSystem
    const path = yield* Path.Path
    const nestedFilePaths = yield* Effect.forEach(
      BLOG_CONTENT_PATTERNS,
      (pattern) =>
        fs
          .glob(`${contentDir}/${pattern}`)
          .pipe(Effect.mapError((cause) => new UnknownError({ cause }))),
      { concurrency: "unbounded" },
    )
    const filePaths = [...new Set(nestedFilePaths.flat())]
    const files = yield* Effect.forEach(
      filePaths,
      Effect.fnUntraced(function* (filePath) {
        const source = yield* readFile(filePath)
        const page = yield* Effect.try({
          try: () => blogPage(source, path.relative(contentDir, filePath)),
          catch: (cause) => new UnknownError({ cause }),
        })
        if (page === undefined) return []
        return yield* chunkFiles({
          chunks: page.chunks,
          directory: page.directory,
          name: page.name,
          metadata: {
            content_source: "blog",
            ...(page.version === undefined
              ? {}
              : { docs_version: page.version }),
          },
          hash,
        })
      }),
      { concurrency: 10 },
    )
    if (files.length === 0) {
      return yield* new UnknownError({
        cause: new Error("No blog posts to index"),
      })
    }
    yield* Effect.log(`Prepared ${files.length} blog files`)
    return files.flat() satisfies ReadonlyArray<LocalFile>
  },
)
