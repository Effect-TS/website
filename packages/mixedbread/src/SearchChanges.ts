import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Stream from "effect/Stream"
import * as ChildProcess from "effect/unstable/process/ChildProcess"
import * as ChildProcessSpawner from "effect/unstable/process/ChildProcessSpawner"

const DIRECTORIES_OF_INTEREST = [
  "apps/web/src/content/docs/",
  "apps/web/src/content/blog/",
  "apps/web/src/features/api-reference/",
  "packages/domain/",
  "packages/api-reference/",
  "packages/mixedbread/",
  "packages/alchemy-mixedbread/",
] as const

const FILES_OF_INTEREST = new Set([
  ".github/workflows/preview.yml",
  "alchemy.run.ts",
  "apps/web/package.json",
  "apps/web/src/content.config.ts",
  "apps/web/src/features/search/domain.ts",
  "package.json",
  "pnpm-lock.yaml",
])

export const includes = (path: string): boolean =>
  FILES_OF_INTEREST.has(path) ||
  DIRECTORIES_OF_INTEREST.some((prefix) => path.startsWith(prefix))

export const any = (paths: Iterable<string>): boolean => {
  for (const path of paths) {
    if (includes(path)) return true
  }
  return false
}

export class SearchChanges extends Context.Service<
  SearchChanges,
  {
    readonly between: (base: string, head: string) => Effect.Effect<boolean>
  }
>()("@website/mixedbread/SearchChanges", {
  make: Effect.gen(function* () {
    const spawner = yield* ChildProcessSpawner.ChildProcessSpawner

    const between = Effect.fn("SearchChanges.between")(
      function* (base: string, head: string) {
        const command = ChildProcess.make`git diff --name-only ${base} ${head}`

        const process = yield* spawner.spawn(command)

        const paths = yield* process.stdout.pipe(
          Stream.decodeText({ encoding: "utf8" }),
          Stream.splitLines,
          Stream.runCollect,
        )

        return any(paths)
      },
      Effect.scoped,
      Effect.orDie,
    )

    return {
      between,
    }
  }),
}) {
  static readonly layer = Layer.effect(this, this.make)
}
