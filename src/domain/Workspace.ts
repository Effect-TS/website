import { Data, Equal, Hash, Option, pipe } from "effect"

export class Workspace extends Data.Class<{
  name: string
  tree: ReadonlyArray<Directory | File>
  command?: string
}> {
  #filesOfInterest: Array<File> | undefined
  get filesOfInterest() {
    if (this.#filesOfInterest) {
      return this.#filesOfInterest
    }
    const files: Array<File> = []
    function walk(children: ReadonlyArray<Directory | File>) {
      children.forEach((child) => {
        if (child._tag === "File") {
          if (child.interesting) {
            files.push(child)
          }
        } else {
          walk(child.children)
        }
      })
    }
    walk(this.tree)
    return (this.#filesOfInterest = files)
  }
  get initialFile() {
    return this.filesOfInterest[0]
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
  interesting: boolean
  language: string
}> {
  constructor(options: {
    name: string
    initialContent: string
    solution?: string
    interesting?: boolean
    language?: string
  }) {
    super({
      ...options,
      interesting: options.interesting ?? true,
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
