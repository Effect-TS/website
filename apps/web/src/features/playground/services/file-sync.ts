import * as Data from "effect/Data"

export interface ModelSnapshot {
  readonly content: string
  readonly modelVersion: number
}

export interface FilesystemRead {
  readonly generation: number
  readonly modelVersion: number
}

export interface FileWrite {
  readonly content: string
  readonly generation: number
  readonly revision: number
}

export type FileSystemReadResult = Data.TaggedEnum<{
  readonly Ignore: {}
  readonly Acknowledge: { readonly revision: number }
  readonly ApplyExternal: { readonly content: string }
}>
export const FileSystemReadResult = Data.taggedEnum<FileSystemReadResult>()

export interface FileSync {
  readonly beginFilesystemRead: () => FilesystemRead
  readonly captureWrite: () => FileWrite | undefined
  readonly completeFilesystemRead: (
    read: FilesystemRead,
    content: string,
  ) => FileSystemReadResult
  readonly currentModel: () => ModelSnapshot
  readonly externalApplied: (model: ModelSnapshot) => void
  readonly invalidate: () => void
  readonly isCurrentWrite: (write: FileWrite) => boolean
  readonly modelChanged: (model: ModelSnapshot) => void
  readonly reset: (model: ModelSnapshot) => void
  readonly writeCompleted: (write: FileWrite) => void
  readonly writeFailed: (write: FileWrite) => void
}

export const FileSync = {
  make(initial: ModelSnapshot): FileSync {
    let generation = 0
    let revision = 0
    let model = initial
    let persistedContent = initial.content
    let capturedRevision: number | undefined
    const completedWrites = new Map<string, number>()

    function beginFilesystemRead(): FilesystemRead {
      return { generation, modelVersion: model.modelVersion }
    }

    function captureWrite(): FileWrite | undefined {
      if (model.content === persistedContent || capturedRevision === revision) {
        return undefined
      }
      capturedRevision = revision
      return { content: model.content, generation, revision }
    }

    function completeFilesystemRead(
      read: FilesystemRead,
      content: string,
    ): FileSystemReadResult {
      const acknowledgedRevision = completedWrites.get(content)
      if (acknowledgedRevision !== undefined) {
        completedWrites.delete(content)
        return FileSystemReadResult.Acknowledge({
          revision: acknowledgedRevision,
        })
      }
      if (
        read.generation !== generation ||
        read.modelVersion !== model.modelVersion
      ) {
        return FileSystemReadResult.Ignore()
      }
      if (content === persistedContent) {
        return FileSystemReadResult.Ignore()
      }
      if (content === model.content) {
        persistedContent = content
        return FileSystemReadResult.Ignore()
      }
      if (model.content !== persistedContent) {
        return FileSystemReadResult.Ignore()
      }
      return FileSystemReadResult.ApplyExternal({ content })
    }

    function currentModel(): ModelSnapshot {
      return model
    }

    function externalApplied(next: ModelSnapshot) {
      revision++
      model = next
      persistedContent = next.content
      capturedRevision = undefined
      completedWrites.clear()
    }

    function invalidate() {
      generation++
      capturedRevision = undefined
      completedWrites.clear()
    }

    function isCurrentWrite(write: FileWrite) {
      return (
        write.generation === generation &&
        write.revision === revision &&
        write.content === model.content
      )
    }

    function modelChanged(next: ModelSnapshot) {
      if (
        next.content === model.content &&
        next.modelVersion === model.modelVersion
      ) {
        return
      }
      revision++
      model = next
    }

    function reset(next: ModelSnapshot) {
      generation++
      revision++
      model = next
      persistedContent = next.content
      capturedRevision = undefined
      completedWrites.clear()
    }

    function writeCompleted(write: FileWrite) {
      if (write.generation !== generation) {
        return
      }
      persistedContent = write.content
      completedWrites.set(write.content, write.revision)
    }

    function writeFailed(write: FileWrite) {
      if (
        write.generation === generation &&
        capturedRevision === write.revision
      ) {
        capturedRevision = undefined
      }
    }

    return {
      beginFilesystemRead,
      captureWrite,
      completeFilesystemRead,
      currentModel,
      externalApplied,
      invalidate,
      isCurrentWrite,
      modelChanged,
      reset,
      writeCompleted,
      writeFailed,
    }
  },
} as const
