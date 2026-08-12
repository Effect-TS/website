---
title: Resourceful Streams
description: Learn how to manage resources in streams with safe acquisition and release, finalization for cleanup tasks, and ensuring post-finalization actions for robust resource handling in streaming applications.
sidebar:
  order: 5
---

Resources acquired by a stream must remain open for the whole period in which the stream is consumed. Compose `Effect.acquireRelease`, `Stream.fromEffect`, and `Stream.scoped` to tie the resource lifetime to the stream. Use `Stream.ensuring` when a stream only needs a finalizer.

## Acquire Release

The following example acquires a file, emits its lines, and closes it when stream consumption ends.

```ts twoslash import.meta.vitest name="acquire-release-1"
import { Stream, Console, Effect } from "effect"

// Simulating File operations
const open = (filename: string) =>
  Effect.gen(function* () {
    yield* Console.log(`Opening ${filename}`)
    return {
      getLines: Effect.succeed(["Line 1", "Line 2", "Line 3"]),
      close: Console.log(`Closing ${filename}`),
    }
  })

const stream = Stream.scoped(
  Stream.fromEffect(
    Effect.acquireRelease(open("file.txt"), (file) => file.close),
  ),
).pipe(Stream.flatMap((file) => Stream.fromIterableEffect(file.getLines)))

await Effect.runPromise(Stream.runCollect(stream)) // => ["Line 1", "Line 2", "Line 3"]
```

`Effect.acquireRelease` registers `file.close` in the scope created by `Stream.scoped`. The file therefore remains open while `Stream.fromIterableEffect` emits its contents.

## Finalization

`Stream.ensuring` runs a finalizer after the stream's own finalizers, whether the stream succeeds, fails, or is interrupted.

```ts twoslash import.meta.vitest name="finalization-1"
import { Stream, Console, Effect } from "effect"

const application = Stream.fromEffect(Console.log("Application Logic."))

const deleteDir = (dir: string) => Console.log(`Deleting dir: ${dir}`)

const program = application.pipe(
  Stream.ensuring(
    deleteDir("tmp").pipe(
      Effect.andThen(Console.log("Temporary directory was deleted.")),
    ),
  ),
)

await Effect.runPromise(Stream.runCollect(program)) // => [undefined]
```
