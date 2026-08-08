import { assert, test } from "vite-plus/test"
import { reconcileApiReferenceFiles } from "../src/ApiReferenceSync.ts"

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
