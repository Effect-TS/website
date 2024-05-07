import { FileSystemTree } from "@webcontainer/api"
import { Array, Data, Equal, Hash, pipe } from "effect"

export class Workspace extends Data.Class<{
  name: string
  files: Array<FileWithContent>
  filesOfInterest: Array<FileWithContent>
}> {
  copyWith(name: string, files: Array<FileWithContent>) {
    return new Workspace({
      name,
      files: this.files.concat(files),
      filesOfInterest: files
    })
  }
  get initialFile() {
    return this.filesOfInterest[0]
  }
  get tree() {
    return Array.reduce(this.files, <FileSystemTree>{}, (tree, file) => {
      tree[file.file] = { file: { contents: file.initialContent } }
      return tree
    })
  }
  [Hash.symbol]() {
    return Hash.string(this.name)
  }
  [Equal.symbol](that: this) {
    return this.name === that.name
  }
}

export class FileWithContent extends Data.Class<{
  file: string
  initialContent: string
}> {
  get language() {
    return "typescript"
  }
  [Hash.symbol]() {
    return pipe(Hash.string(this.file), Hash.cached(this))
  }
  [Equal.symbol](that: this) {
    return this.file === that.file
  }
}
