import * as Effect from "effect/Effect"
import * as FileSystem from "effect/FileSystem"
import * as Path from "effect/Path"
import * as Blog from "./Blog.ts"
import { BLOG_CONTENT_PATTERNS } from "./Config.ts"
import type { SyncOptions } from "./Config.ts"
import * as Documentation from "./Documentation.ts"
import { UnknownError } from "./Error.ts"

export const stageDocumentation = Effect.fn("MarkdownSync.stageDocumentation")(
  function* (options: {
    readonly contentDir: string
    readonly stageDir: string
  }) {
    const fs = yield* FileSystem.FileSystem
    const path = yield* Path.Path
    yield* fs
      .remove(options.stageDir, { recursive: true, force: true })
      .pipe(Effect.mapError((cause) => new UnknownError({ cause })))
    const filePaths = yield* fs
      .glob(`${options.contentDir}/**/*.{md,mdx}`)
      .pipe(Effect.mapError((cause) => new UnknownError({ cause })))
    const staged = yield* Effect.forEach(
      filePaths,
      Effect.fnUntraced(function* (filePath) {
        const source = yield* fs
          .readFileString(filePath)
          .pipe(Effect.mapError((cause) => new UnknownError({ cause })))
        const relativePath = path.relative(options.contentDir, filePath)
        const document = yield* Effect.try({
          try: () => Documentation.stageDocument(source, relativePath),
          catch: (cause) => new UnknownError({ cause }),
        })
        if (document === undefined) return false
        const destination = path.join(options.stageDir, relativePath)
        yield* fs
          .makeDirectory(path.dirname(destination), { recursive: true })
          .pipe(Effect.mapError((cause) => new UnknownError({ cause })))
        yield* fs
          .writeFileString(destination, document.source)
          .pipe(Effect.mapError((cause) => new UnknownError({ cause })))
        return true
      }),
      { concurrency: "unbounded" },
    )
    const count = staged.filter(Boolean).length
    if (count === 0) {
      return yield* new UnknownError({
        cause: new Error("No documentation files to index"),
      })
    }
    yield* Effect.log(
      `Staged ${count} documentation files in ${options.stageDir}`,
    )
  },
)

export const stageBlog = Effect.fn("MarkdownSync.stageBlog")(
  function* (options: {
    readonly contentDir: string
    readonly stageDir: string
  }) {
    const fs = yield* FileSystem.FileSystem
    const path = yield* Path.Path
    yield* fs
      .remove(options.stageDir, { recursive: true, force: true })
      .pipe(Effect.mapError((cause) => new UnknownError({ cause })))
    const nestedFilePaths = yield* Effect.forEach(
      BLOG_CONTENT_PATTERNS,
      (pattern) =>
        fs
          .glob(`${options.contentDir}/${pattern}`)
          .pipe(Effect.mapError((cause) => new UnknownError({ cause }))),
      { concurrency: "unbounded" },
    )
    const filePaths = [...new Set(nestedFilePaths.flat())]
    const staged = yield* Effect.forEach(
      filePaths,
      Effect.fnUntraced(function* (filePath) {
        const source = yield* fs
          .readFileString(filePath)
          .pipe(Effect.mapError((cause) => new UnknownError({ cause })))
        const relativePath = path.relative(options.contentDir, filePath)
        const post = yield* Effect.try({
          try: () => Blog.stageBlogPost(source, relativePath),
          catch: (cause) => new UnknownError({ cause }),
        })
        if (post === undefined) return false
        const destination = path.join(options.stageDir, relativePath)
        yield* fs
          .makeDirectory(path.dirname(destination), { recursive: true })
          .pipe(Effect.mapError((cause) => new UnknownError({ cause })))
        yield* fs
          .writeFileString(destination, post.source)
          .pipe(Effect.mapError((cause) => new UnknownError({ cause })))
        return true
      }),
      { concurrency: "unbounded" },
    )
    const count = staged.filter(Boolean).length
    if (count === 0) {
      return yield* new UnknownError({
        cause: new Error("No blog posts to index"),
      })
    }
    yield* Effect.log(`Staged ${count} blog posts in ${options.stageDir}`)
  },
)

export function markdownSyncMetadata(
  options: SyncOptions,
  version: number,
): string {
  return JSON.stringify({
    content_source: "markdown",
    version,
    ...(options.kind === "preview"
      ? { pull_request: options.pullRequest }
      : {}),
  })
}

export function markdownSyncArguments(options: {
  readonly blogStageDir: string
  readonly documentationStageDir: string
  readonly metadata: string
  readonly storeId: string
}): ReadonlyArray<string> {
  return [
    "exec",
    "mxbai",
    "store",
    "sync",
    options.storeId,
    `${options.documentationStageDir}/**/*.{md,mdx}`,
    `${options.blogStageDir}/**/*.mdx`,
    "--yes",
    "--strategy",
    "fast",
    "--max-chunk-size",
    "500",
    "--metadata",
    options.metadata,
  ]
}
