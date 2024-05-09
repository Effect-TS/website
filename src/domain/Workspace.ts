import { Data, Equal, Hash, Iterable, Option, pipe } from "effect"

export class Workspace extends Data.Class<{
  name: string
  tree: ReadonlyArray<Directory | File>
  initialFilePath?: string
  prepare?: string
  command?: string
}> {
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
    walk("", this.tree)
    return (this.#filePaths = paths)
  }
  pathTo(file: File) {
    return Option.fromNullable(this.filePaths.get(file))
  }
  [Hash.symbol]() {
    return Hash.string(this.name)
  }
  [Equal.symbol](that: this) {
    return this.name === that.name
  }
}

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
