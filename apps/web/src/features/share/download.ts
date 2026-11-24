import * as zip from "@zip.js/zip.js"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import * as Layer from "effect/Layer"
import { FileTree, Workspace } from "./workspace"

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

/** Zips `tree`, with every entry under `basePath` (`""` or ending in `/`). */
const zipTree = (tree: FileTree, basePath = "") =>
  Effect.gen(function* () {
    const zipWriter = new zip.ZipWriter(new zip.BlobWriter("application/zip"))
    yield* writeTree(zipWriter)(tree, basePath)
    return yield* Effect.promise(() => zipWriter.close())
  })

export class Zip extends Context.Service<Zip>()("app/Download/Zip", {
  make: Effect.sync(() => ({
    create: (tree: FileTree) => zipTree(tree),
  })),
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

/**
 * The Workspace name as a single path segment: separators and characters
 * file systems reject become `-`. Falls back to `workspace`.
 */
export const workspaceFolderName = (workspace: Workspace): string => {
  const name = workspace.name
    .trim()
    .replace(/[/\\:*?"<>|\s]+/g, "-")
    .replace(/^[-.]+|-+$/g, "")
  return name === "" ? "workspace" : name
}

export interface WorkspaceZip {
  /** `<Workspace name>.zip`. */
  readonly name: string
  readonly content: Blob
}

/**
 * Zips a Workspace whose tree holds the file contents (as a share-format
 * Workspace does), every file under a folder named after the Workspace.
 */
export const zipWorkspace = (
  workspace: Workspace,
): Effect.Effect<WorkspaceZip> => {
  const folder = workspaceFolderName(workspace)
  return Effect.map(zipTree(workspace.tree, `${folder}/`), (content) => ({
    name: `${folder}.zip`,
    content,
  }))
}
