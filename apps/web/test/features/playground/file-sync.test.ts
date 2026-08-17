import { assert, test } from "vite-plus/test"
import { FileSync } from "../../../src/features/playground/services/file-sync.ts"

test("ignores a filesystem read that started before a newer model revision", () => {
  const sync = FileSync.make({ content: "V0", modelVersion: 1 })
  const read = sync.beginFilesystemRead()

  sync.modelChanged({ content: "V2", modelVersion: 2 })

  assert.deepEqual(sync.completeFilesystemRead(read, "V1"), {
    _tag: "Ignore",
  })
})

test("acknowledges an older local write without rolling back the model", () => {
  const sync = FileSync.make({ content: "V0", modelVersion: 1 })
  sync.modelChanged({ content: "V1", modelVersion: 2 })
  const write = sync.captureWrite()
  assert.ok(write)

  sync.modelChanged({ content: "V2", modelVersion: 3 })
  sync.writeCompleted(write)

  const read = sync.beginFilesystemRead()
  assert.deepEqual(sync.completeFilesystemRead(read, "V1"), {
    _tag: "Acknowledge",
    revision: write.revision,
  })
  assert.deepEqual(sync.currentModel(), {
    content: "V2",
    modelVersion: 3,
  })

  const duplicateRead = sync.beginFilesystemRead()
  assert.deepEqual(sync.completeFilesystemRead(duplicateRead, "V1"), {
    _tag: "Ignore",
  })
  assert.deepEqual(sync.currentModel(), {
    content: "V2",
    modelVersion: 3,
  })
})

test("does not persist a programmatic external model update as a user edit", () => {
  const sync = FileSync.make({ content: "V0", modelVersion: 1 })
  const read = sync.beginFilesystemRead()

  assert.deepEqual(sync.completeFilesystemRead(read, "external"), {
    _tag: "ApplyExternal",
    content: "external",
  })

  sync.externalApplied({ content: "external", modelVersion: 2 })
  sync.modelChanged({ content: "external", modelVersion: 2 })

  assert.equal(sync.captureWrite(), undefined)
  assert.deepEqual(sync.currentModel(), {
    content: "external",
    modelVersion: 2,
  })
})

test("ignores an external update while the model has unpersisted changes", () => {
  const sync = FileSync.make({ content: "V0", modelVersion: 1 })
  sync.modelChanged({ content: "local", modelVersion: 2 })
  const read = sync.beginFilesystemRead()

  assert.deepEqual(sync.completeFilesystemRead(read, "external"), {
    _tag: "Ignore",
  })
  assert.deepEqual(sync.currentModel(), {
    content: "local",
    modelVersion: 2,
  })
  assert.ok(sync.captureWrite())
})

test("invalidates queued writes when the workspace generation changes", () => {
  const sync = FileSync.make({ content: "V0", modelVersion: 1 })
  sync.modelChanged({ content: "stale", modelVersion: 2 })
  const write = sync.captureWrite()
  assert.ok(write)

  sync.reset({ content: "reset", modelVersion: 3 })

  assert.equal(sync.isCurrentWrite(write), false)
  assert.equal(sync.captureWrite(), undefined)
  assert.deepEqual(sync.currentModel(), {
    content: "reset",
    modelVersion: 3,
  })
})

test("invalidates a captured write when the model advances", () => {
  const sync = FileSync.make({ content: "V0", modelVersion: 1 })
  sync.modelChanged({ content: "V1", modelVersion: 2 })
  const first = sync.captureWrite()
  assert.ok(first)
  assert.equal(sync.isCurrentWrite(first), true)

  sync.modelChanged({ content: "V2", modelVersion: 3 })
  const second = sync.captureWrite()
  assert.ok(second)

  assert.equal(sync.isCurrentWrite(first), false)
  assert.equal(sync.isCurrentWrite(second), true)
  assert.ok(second.revision > first.revision)
})

test("allows a failed write to be retried at the same revision", () => {
  const sync = FileSync.make({ content: "V0", modelVersion: 1 })
  sync.modelChanged({ content: "V1", modelVersion: 2 })
  const failed = sync.captureWrite()
  assert.ok(failed)

  sync.writeFailed(failed)

  assert.deepEqual(sync.captureWrite(), failed)
})

test("invalidates a queued path write without discarding dirty content", () => {
  const sync = FileSync.make({ content: "V0", modelVersion: 1 })
  sync.modelChanged({ content: "dirty", modelVersion: 2 })
  const oldPathWrite = sync.captureWrite()
  assert.ok(oldPathWrite)

  sync.invalidate()

  const newPathWrite = sync.captureWrite()
  assert.ok(newPathWrite)
  assert.equal(sync.isCurrentWrite(oldPathWrite), false)
  assert.equal(sync.isCurrentWrite(newPathWrite), true)
  assert.equal(newPathWrite.content, "dirty")
  assert.ok(newPathWrite.generation > oldPathWrite.generation)
})
