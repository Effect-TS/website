import { Brand, Effect, Hash, Iterable, Option } from "effect"
import * as Schema from "@effect/schema/Schema"

export type FullPath = Brand.Branded<string, "FullPath">
export const FullPath = Brand.nominal<FullPath>()

export class File extends Schema.TaggedClass<File>()("File", {
  name: Schema.String,
  initialContent: Schema.String,
  solution: Schema.optional(Schema.String),
  language: Schema.String.pipe(
    Schema.optional({ default: () => "typescript" })
  ),
  userManaged: Schema.Boolean.pipe(Schema.optional({ default: () => false }))
}) {
  withContent(content: string) {
    return new File({
      ...this,
      initialContent: content
    })
  }
}

export interface Directory {
  readonly _tag: "Directory"
  readonly name: string
  readonly userManaged: boolean
  readonly children: ReadonlyArray<Directory | File>
}
const Directory_: Schema.Struct<{
  _tag: Schema.tag<"Directory">
  name: typeof Schema.String
  userManaged: Schema.optionalWithOptions<
    typeof Schema.Boolean,
    { default: () => false }
  >
  children: Schema.Array$<
    Schema.Union<[typeof File, Schema.Schema<Directory>]>
  >
}> = Schema.Struct({
  _tag: Schema.tag("Directory"),
  name: Schema.String,
  userManaged: Schema.Boolean.pipe(Schema.optional({ default: () => false })),
  children: Schema.Array(
    Schema.Union(
      File,
      Schema.suspend(() => Directory_) as Schema.Schema<Directory>
    )
  )
})
export const Directory: Schema.Schema<
  Directory,
  Schema.Schema.Encoded<typeof Directory_>
> = Directory_
export const makeDirectory = (
  name: string,
  children: ReadonlyArray<File | Directory>,
  userManaged: boolean = false
): Directory => Directory_.make({ name, userManaged, children })

export const FileTree = Schema.Array(Schema.Union(File, Directory))
export type FileTree = typeof FileTree.Type

export class WorkspaceShell extends Schema.Class<WorkspaceShell>(
  "WorkspaceShell"
)({
  command: Schema.optional(Schema.String),
  label: Schema.optional(Schema.String)
}) {
  [Hash.symbol]() {
    return Hash.random(this)
  }
}

export class Workspace extends Schema.Class<Workspace>("Workspace")({
  name: Schema.String,
  tree: FileTree,
  initialFilePath: Schema.optional(Schema.String),
  prepare: Schema.String,
  shells: Schema.Array(WorkspaceShell),
  snapshot: Schema.optional(Schema.String)
}) {
  readonly filePaths: Map<File | Directory, string>

  constructor(options: {
    name: string
    dependencies?: Record<string, string>
    tree?: ReadonlyArray<Directory | File>
    initialFilePath?: string
    prepare?: string
    shells: ReadonlyArray<WorkspaceShell>
    snapshot?: string
  }) {
    super({
      name: options.name,
      initialFilePath: options.initialFilePath,
      prepare:
        options.prepare ??
        "npm install -E esbuild typescript@next tsc-watch @types/node",
      shells: options.shells,
      snapshot: options.snapshot,
      tree: [
        ...(options.dependencies
          ? [
              new File({
                name: "package.json",
                language: "json",
                initialContent: JSON.stringify(
                  {
                    dependencies: options.dependencies
                  },
                  undefined,
                  2
                )
              }),
              ...defaultFiles
            ]
          : []),
        ...(options.tree ?? [])
      ]
    })
    this.filePaths = makeFilePaths(this.tree)
  }

  withName(name: string) {
    return new Workspace({
      ...this,
      name
    })
  }
  withPrepare(prepare: string) {
    return new Workspace({
      ...this,
      prepare
    })
  }
  get withNoSnapshot() {
    return new Workspace({
      ...this,
      snapshot: undefined
    })
  }
  append(...children: Workspace["tree"]) {
    return new Workspace({
      ...this,
      tree: [...this.tree, ...children]
    })
  }
  setTree(tree: FileTree) {
    return new Workspace({ ...this, tree })
  }
  filterMap(f: (item: File | Directory) => Option.Option<File | Directory>) {
    return this.setTree(filterMapTree(this.tree, f))
  }
  replaceNode(node: File | Directory, replacement: File | Directory) {
    return this.filterMap((item) =>
      item === node ? Option.some(replacement) : Option.some(item)
    )
  }
  removeNode(node: File | Directory) {
    return this.filterMap((item) =>
      item === node ? Option.none() : Option.some(item)
    )
  }
  findFile(name: string) {
    return Iterable.findFirst(
      this.filePaths,
      ([_, path]) => _._tag === "File" && path === name
    ) as Option.Option<[File, string]>
  }
  get initialFile() {
    if (this.initialFilePath) {
      return Option.getOrThrow(this.findFile(this.initialFilePath))[0]
    }
    return Option.getOrThrow(Iterable.head(this.filePaths.keys()))
  }
  get dependencies(): Record<string, string> {
    const parse = Option.liftThrowable(JSON.parse)
    return this.findFile("package.json").pipe(
      Option.flatMap(([file]) => parse(file.initialContent)),
      Option.map((json) => json.dependencies),
      Option.getOrElse(() => ({}))
    )
  }
  pathTo(file: File | Directory) {
    return Option.fromNullable(this.filePaths.get(file))
  }
  fullPathTo(file: File) {
    return this.pathTo(file).pipe(
      Option.map((path) => FullPath(`${this.name}/${path}`))
    )
  }
  updateFiles<E, R>(
    f: (item: File, path: string) => Effect.Effect<File, E, R>
  ) {
    const walk = (
      tree: ReadonlyArray<File | Directory>
    ): Effect.Effect<ReadonlyArray<Directory | File>, E, R> =>
      Effect.gen(this, function* () {
        const out: Array<File | Directory> = []
        for (const node of tree) {
          if (node._tag === "File") {
            out.push(yield* f(node, this.filePaths.get(node)!))
          } else {
            out.push(
              makeDirectory(
                node.name,
                yield* walk(node.children),
                node.userManaged
              )
            )
          }
        }
        return out
      })
    return Effect.map(
      walk(this.tree),
      (tree) => new Workspace({ ...this, tree })
    )
  }
  addShell(shell: WorkspaceShell) {
    return new Workspace({
      ...this,
      shells: [...this.shells, shell]
    })
  }
  removeShell(shell: WorkspaceShell) {
    return new Workspace({
      ...this,
      shells: this.shells.filter((s) => s !== shell)
    })
  }
  [Hash.symbol]() {
    return Hash.string(this.name)
  }
}

// helper functions

function makeFilePaths(tree: Workspace["tree"]) {
  const paths = new Map<File | Directory, string>()
  function walk(prefix: string, children: Workspace["tree"]) {
    children.forEach((child) => {
      paths.set(child, `${prefix}${child.name}`)
      if (child._tag === "Directory") {
        walk(`${prefix}${child.name}/`, child.children)
      }
    })
  }
  walk("", tree)
  return paths
}

export const defaultFiles = [
  new File({
    name: "dprint.json",
    language: "json",
    initialContent: JSON.stringify(
      {
        json: {
          indentWidth: 2,
          lineWidth: 120,
          trailingCommas: "never"
        },
        typescript: {
          indentWidth: 2,
          lineWidth: 120,
          operatorPosition: "maintain",
          semiColons: "asi",
          quoteStyle: "alwaysDouble",
          trailingCommas: "never",
          "arrowFunction.useParentheses": "force"
        },
        plugins: [
          "/vendor/dprint/plugins/json-0.19.2.wasm",
          "/vendor/dprint/plugins/typescript-0.91.0.wasm"
        ]
      },
      undefined,
      2
    )
  }),
  new File({
    name: "tsconfig.json",
    language: "json",
    initialContent: JSON.stringify(
      {
        compilerOptions: {
          allowSyntheticDefaultImports: true,
          exactOptionalPropertyTypes: true,
          module: "NodeNext",
          moduleResolution: "NodeNext",
          strict: true,
          target: "esnext"
        },
        include: ["src"]
      },
      undefined,
      2
    )
  })
]

function filterMapTree(
  tree: FileTree,
  f: (node: File | Directory) => Option.Option<File | Directory>
): FileTree {
  const out: Array<File | Directory> = []
  for (const node of tree) {
    const result = f(node)
    if (result._tag === "None") {
      continue
    }
    if (result.value === node && result.value._tag === "Directory") {
      out.push(
        makeDirectory(
          result.value.name,
          filterMapTree(result.value.children, f),
          result.value.userManaged
        )
      )
    } else {
      out.push(result.value)
    }
  }
  return out
}
