import * as zip from "@zip.js/zip.js"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import * as Layer from "effect/Layer"
import { FileTree, Workspace } from "../domain/workspace"

export class Zip extends Context.Service<Zip>()("app/Download/Zip", {
  make: Effect.sync(() => {
    const writeTree =
      <T>(zipWriter: zip.ZipWriter<T>) =>
      (tree: Workspace["tree"], basePath: string): Effect.Effect<void> =>
        Effect.gen(function* () {
          for (const fileOrDir of tree) {
            if (fileOrDir._tag === "File") {
              yield* Effect.promise(() =>
                zipWriter.add(
                  basePath + fileOrDir.name,
                  new zip.TextReader(fileOrDir.initialContent),
                ),
              )
            } else {
              yield* writeTree(zipWriter)(
                fileOrDir.children,
                basePath + fileOrDir.name + "/",
              )
            }
          }
        })

    return {
      create: (tree: FileTree) =>
        Effect.gen(function* () {
          const zipFileWriter = new zip.BlobWriter()
          const zipWriter = new zip.ZipWriter(zipFileWriter)

          yield* writeTree(zipWriter)(tree, "")

          return yield* Effect.promise(() => zipWriter.close())
        }),
    }
  }),
}) {
  static readonly layer = Layer.effect(this, this.make)
}

export class WorkspaceDownload extends Context.Service<WorkspaceDownload>()(
  "app/Download/Workspace",
  {
    make: Effect.gen(function* () {
      const zipService = yield* Zip
      const pack = <E, R>(
        workspace: Workspace,
        read: (file: string) => Effect.Effect<string, E, R>,
      ) =>
        pipe(
          workspace
            .withPrepare("pnpm install")
            .withNoSnapshot.updateFiles((file, path) =>
              read(workspace.relativePath(path)).pipe(
                Effect.map((content) => file.withContent(content)),
              ),
            ),
          Effect.flatMap((_) => zipService.create(_.tree)),
        )

      return { pack } as const
    }),
  },
) {
  static readonly layer = Layer.effect(this, this.make).pipe(
    Layer.provide(Zip.layer),
  )
}
