import * as Effect from "effect/Effect"
import { assert, test } from "vite-plus/test"
import {
  reconcileApiReferenceFiles,
  waitForIndexing,
} from "../src/ApiReferenceSync.ts"

test("reconciles changed, unchanged, and stale API files", () => {
  const local = [
    { externalId: "api-reference/v4/effect-001.mxjson", fileHash: "same" },
    { externalId: "api-reference/v4/sql-001.mxjson", fileHash: "new" },
    { externalId: "api-reference/v4/platform-001.mxjson", fileHash: "added" },
  ]
  const remote = [
    {
      external_id: "api-reference/v4/effect-001.mxjson",
      metadata: { file_hash: "same", version: 2 },
      status: "completed",
    },
    {
      external_id: "api-reference/v4/sql-001.mxjson",
      metadata: { file_hash: "old", version: 2 },
      status: "completed",
    },
    {
      external_id: "api-reference/v3/old-001.mxjson",
      metadata: { file_hash: "old", version: 2 },
      status: "completed",
    },
  ]

  const result = reconcileApiReferenceFiles(local, remote, 2)

  assert.deepEqual(
    result.changedFiles.map((file) => file.externalId),
    ["api-reference/v4/sql-001.mxjson", "api-reference/v4/platform-001.mxjson"],
  )
  assert.deepEqual(
    result.staleFiles.map((file) => file.external_id),
    ["api-reference/v3/old-001.mxjson"],
  )
})

test("reuploads failed files and files with invalid metadata", () => {
  const local = [{ externalId: "api-reference/v4/file", fileHash: "hash" }]

  assert.equal(
    reconcileApiReferenceFiles(
      local,
      [
        {
          external_id: "api-reference/v4/file",
          metadata: {},
          status: "completed",
        },
      ],
      2,
    ).changedFiles.length,
    1,
  )
  assert.equal(
    reconcileApiReferenceFiles(
      local,
      [
        {
          external_id: "api-reference/v4/file",
          metadata: { file_hash: "hash", version: 2 },
          status: "failed",
        },
      ],
      2,
    ).changedFiles.length,
    1,
  )
})

const files = [{ externalId: "api-reference/v4/file", id: "file_1" }]

test("waits until a pending file completes", async () => {
  const statuses = ["pending", "in_progress", "completed"]
  let calls = 0
  await Effect.runPromise(
    waitForIndexing({
      files,
      interval: "1 millis",
      retrieve: () => Effect.sync(() => ({ status: statuses[calls++] })),
    }),
  )
  assert.equal(calls, 3)
})

test("fails when a file fails indexing", async () => {
  const error = await Effect.runPromise(
    waitForIndexing({
      files,
      interval: "1 millis",
      retrieve: () =>
        Effect.succeed({ status: "failed", last_error: "bad chunk" }),
    }).pipe(Effect.flip),
  )
  assert.equal(error._tag, "FailedToIndexError")
  assert.equal(error.cause, "bad chunk")
})

test("fails when a file stays pending past the timeout", async () => {
  const error = await Effect.runPromise(
    waitForIndexing({
      files,
      interval: "1 millis",
      timeout: "20 millis",
      retrieve: () => Effect.succeed({ status: "pending" }),
    }).pipe(Effect.flip),
  )
  assert.equal(error._tag, "FailedToIndexError")
})
