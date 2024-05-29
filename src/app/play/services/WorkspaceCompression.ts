import {
  Directory,
  File,
  Workspace,
  WorkspaceShell
} from "@/workspaces/domain/workspace"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { Compression } from "./Compression"
import * as Schema from "@effect/schema/Schema"
import { Option } from "effect"

type CompressedFile = readonly [
  name: string,
  language: string,
  content: string
]
const CompressedFile: Schema.Schema<CompressedFile> = Schema.Tuple(
  Schema.String, // name
  Schema.String, // language
  Schema.String // content
)

type CompressedDirectory = readonly [
  name: string,
  children: ReadonlyArray<CompressedFile | CompressedDirectory>
]
const CompressedDirectory: Schema.Schema<CompressedDirectory> = Schema.Tuple(
  Schema.String,
  Schema.Array(
    Schema.Union(
      CompressedFile,
      Schema.suspend(() => CompressedDirectory)
    )
  )
)
const CompressedFileTree = Schema.Array(
  Schema.Union(CompressedFile, CompressedDirectory)
)
type CompressedFileTree = Schema.Schema.Type<typeof CompressedFileTree>

const CompressedWorkspace = Schema.Tuple(
  Schema.String, // name
  CompressedFileTree // tree
)

type CompressedWorkspace = Schema.Schema.Type<typeof CompressedWorkspace>

const decodeWorkspace = Schema.decode(Schema.parseJson(CompressedWorkspace))
const encodeWorkspace = Schema.encode(Schema.parseJson(CompressedWorkspace))

function convertTree(
  compressed: CompressedFileTree
): ReadonlyArray<Directory | File> {
  return compressed.map((item) => {
    switch (item.length) {
      case 2: {
        const [name, children] = item
        return new Directory(name, convertTree(children))
      }
      case 3: {
        const [name, language, content] = item
        return new File({
          name,
          language,
          initialContent: content
        })
      }
    }
  })
}

const make = Effect.gen(function* () {
  const compression = yield* Compression

  const compress = <E, R>(
    workspace: Workspace,
    read: (file: string) => Effect.Effect<string, E, R>
  ) => {
    function walk(
      tree: ReadonlyArray<Directory | File>
    ): Effect.Effect<CompressedFileTree, E, R> {
      return Effect.gen(function* () {
        let compressed: Array<CompressedDirectory | CompressedFile> = []
        for (const node of tree) {
          if (node._tag === "File") {
            const path = Option.getOrThrow(workspace.pathTo(node))
            compressed.push([node.name, node.language, yield* read(path)])
          } else {
            compressed.push([node.name, yield* walk(node.children)])
          }
        }
        return compressed
      })
    }
    return walk(workspace.tree).pipe(
      Effect.map((tree) => [workspace.name, tree] as CompressedWorkspace),
      Effect.andThen(encodeWorkspace),
      Effect.andThen(compression.compressBase64)
    )
  }

  const decompress = (options: {
    shells: ReadonlyArray<WorkspaceShell>
    initialFilePath?: string | undefined
    compressed: string
    whitelist: ReadonlyArray<string>
  }) =>
    compression.decompressBase64(options.compressed).pipe(
      Effect.andThen(decodeWorkspace),
      Effect.map(([name, files]) => {
        return new Workspace({
          name,
          prepare: "npm install",
          initialFilePath: options.initialFilePath,
          shells: options.shells,
          tree: convertTree(files)
        })
      })
    )

  return { compress, decompress } as const
})

export class WorkspaceCompression extends Effect.Tag(
  "app/Compression/Workspace"
)<WorkspaceCompression, Effect.Effect.Success<typeof make>>() {
  static Live = Layer.effect(WorkspaceCompression, make).pipe(
    Layer.provide(Compression.Live)
  )
}
