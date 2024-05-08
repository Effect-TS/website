import { Data, Equal, Hash, pipe } from "effect"

export class Workspace extends Data.Class<{
  name: string
  tree: ReadonlyArray<Directory | File>
  command?: string
}> {
  _filesOfInterest: Array<File> | undefined
  get filesOfInterest() {
    if (this._filesOfInterest) {
      return this._filesOfInterest
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
    return (this._filesOfInterest = files)
  }
  get initialFile() {
    return this.filesOfInterest[0]
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
  interesting: boolean
  language: string
}> {
  constructor(options: {
    name: string
    initialContent: string
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
