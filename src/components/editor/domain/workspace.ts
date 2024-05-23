import * as Brand from "effect/Brand"
import * as Data from "effect/Data"
import * as Equal from "effect/Equal"
import { pipe } from "effect/Function"
import * as Hash from "effect/Hash"
import * as Iterable from "effect/Iterable"
import * as Option from "effect/Option"

export type FullPath = Brand.Branded<string, "FullPath">
export const FullPath = Brand.nominal<FullPath>()

export class Workspace extends Data.Class<{
  name: string
  tree: ReadonlyArray<Directory | File>
  initialFilePath?: string
  prepare: string
  shells: ReadonlyArray<WorkspaceShell>
  snapshot?: string
}> {
  readonly filePaths: Map<File, string>

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
      prepare: options.prepare ?? "npm install",
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
                    type: "module",
                    dependencies: options.dependencies
                  },
                  undefined,
                  2
                )
              })
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
  append(...children: Workspace["tree"]) {
    return new Workspace({
      ...this,
      tree: [...this.tree, ...children]
    })
  }
  findFile(name: string) {
    return Iterable.findFirst(this.filePaths, ([_, path]) => path === name)
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
  pathTo(file: File) {
    return Option.fromNullable(this.filePaths.get(file))
  }
  fullPathTo(file: File) {
    return this.pathTo(file).pipe(
      Option.map((path) => FullPath(`${this.name}/${path}`))
    )
  }
  [Hash.symbol]() {
    return Hash.string(this.name)
  }
  [Equal.symbol](that: this) {
    return this.name === that.name
  }
}

export class WorkspaceShell extends Data.Class<{
  command?: string
  label?: string
}> {}

export class Directory extends Data.TaggedClass("Directory")<{
  name: string
  children: ReadonlyArray<Directory | File>
}> {
  constructor(name: string, children: ReadonlyArray<Directory | File>) {
    super({
      name,
      children: Data.array(children)
    })
  }
}

export class File extends Data.TaggedClass("File")<{
  name: string
  initialContent: string
  solution?: string
  language: string
}> {
  constructor(options: {
    name: string
    initialContent: string
    solution?: string
    language?: string
  }) {
    super({
      ...options,
      language: options.language ?? "typescript"
    })
  }
  [Hash.symbol]() {
    return pipe(Hash.string(this.name), Hash.cached(this))
  }
  [Equal.symbol](that: this) {
    return this.name === that.name
  }
}

// helper functions

function makeFilePaths(tree: Workspace["tree"]) {
  const paths = new Map<File, string>()
  function walk(prefix: string, children: Workspace["tree"]) {
    children.forEach((child) => {
      if (child._tag === "File") {
        paths.set(child, `${prefix}${child.name}`)
      } else {
        walk(`${prefix}${child.name}/`, child.children)
      }
    })
  }
  walk("", tree)
  return paths
}
