---
title: Path
description: Perform file path operations such as joining, resolving, and normalizing across platforms.
sidebar:
  order: 4
---

The `effect/Path` module provides a set of operations for working with file paths.

## Basic Usage

The module provides a single `Path` [service key](/docs/v4/requirements-management/services/), which acts as the gateway for interacting with paths.

**Example** (Accessing the Path Service)

```ts twoslash import.meta.vitest name="basic-usage-1"
import { Effect, Path } from "effect"

const program = Effect.gen(function* () {
  const path = yield* Path.Path

  // Use `path` to perform various path operations
})

Path.Path.key // => "effect/Path"
```

The `Path` interface includes the following operations:

| Operation            | Description                                                                |
| -------------------- | -------------------------------------------------------------------------- |
| **basename**         | Returns the last part of a path, optionally removing a given suffix.       |
| **dirname**          | Returns the directory part of a path.                                      |
| **extname**          | Returns the file extension from a path.                                    |
| **format**           | Formats a path object into a path string.                                  |
| **fromFileUrl**      | Converts a file URL to a path.                                             |
| **isAbsolute**       | Checks if a path is absolute.                                              |
| **join**             | Joins multiple path segments into one.                                     |
| **normalize**        | Normalizes a path by resolving `.` and `..` segments.                      |
| **parse**            | Parses a path string into an object with its segments.                     |
| **relative**         | Computes the relative path from one path to another.                       |
| **resolve**          | Resolves a sequence of paths to an absolute path.                          |
| **sep**              | Returns the platform-specific path segment separator (e.g., `/` on POSIX). |
| **toFileUrl**        | Converts a path to a file URL.                                             |
| **toNamespacedPath** | Converts a path to a namespaced path (specific to Windows).                |

**Example** (Joining Path Segments)

```ts twoslash
import { Effect, Path } from "effect"
import { NodeServices, NodeRuntime } from "@effect/platform-node"

const program = Effect.gen(function* () {
  const path = yield* Path.Path

  const mypath = path.join("tmp", "file.txt")
  console.log(mypath)
})

NodeRuntime.runMain(program.pipe(Effect.provide(NodeServices.layer)))
// Output: "tmp/file.txt"
```
