import { Brand, Data, Equal, Hash, Iterable, Option, pipe } from "effect"

export type FullPath = Brand.Branded<string, "FullPath">
export const FullPath = Brand.nominal<FullPath>()

export class Workspace extends Data.Class<{
  name: string
  dependencies: Record<string, string>,
  tree: ReadonlyArray<Directory | File>
  initialFilePath?: string
  prepare?: string
  shells: ReadonlyArray<WorkspaceShell>
  snapshot?: string
}> {
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
  get initialFile() {
    if (this.initialFilePath) {
      return Option.getOrThrow(
        Iterable.findFirst(
          this.filePaths,
          ([_, path]) => path === this.initialFilePath
        )
      )[0]
    }
    return Option.getOrThrow(Iterable.head(this.filePaths.keys()))
  }
  #filePaths: Map<File, string> | undefined
  get filePaths() {
    if (this.#filePaths) {
      return this.#filePaths
    }
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
    walk("", this.fileSystem)
    return (this.#filePaths = paths)
  }
  #packageJson: File | undefined
  get packageJson(): File {
    if (this.#packageJson) {
      return this.#packageJson
    }
    const packageJson = new File({
      name: "package.json",
      language: "json",
      initialContent: JSON.stringify({
        name: this.name,
        type: "module",
        dependencies: this.dependencies
      }, undefined, 2)
    })
    return (this.#packageJson = packageJson)
  }
  get fileSystem(): ReadonlyArray<File | Directory> {
    return [this.packageJson, ...this.tree]
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
