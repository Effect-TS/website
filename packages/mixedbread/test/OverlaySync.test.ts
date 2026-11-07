import { assert, test } from "vite-plus/test"
import {
  markdownOverlayKey,
  markdownSyncArguments,
} from "../src/MarkdownSync.ts"
import { planOverlay } from "../src/OverlaySync.ts"

const remote = (
  id: string,
  externalId: string,
  fileHash: string,
  status = "completed",
) => ({
  id,
  external_id: externalId,
  metadata: { file_hash: fileHash, version: 2 },
  status,
})

test("uploads changed and new files, and hides replaced and deleted production files", () => {
  const local = [
    { externalId: "/w/docs/same.mdx", fileHash: "sha256:aaa" },
    { externalId: "/w/docs/edited.mdx", fileHash: "sha256:new" },
    { externalId: "/w/docs/added.mdx", fileHash: "sha256:bbb" },
  ]
  const production = [
    remote("p1", "/w/docs/same.mdx", "sha256:aaa"),
    remote("p2", "/w/docs/edited.mdx", "sha256:old"),
    remote("p3", "/w/docs/deleted.mdx", "sha256:ccc"),
  ]

  const plan = planOverlay(local, production, 2)

  assert.deepEqual(
    plan.upload.map((file) => file.externalId),
    ["/w/docs/edited.mdx", "/w/docs/added.mdx"],
  )
  assert.deepEqual([...plan.hidden].sort(), ["p2", "p3"])
})

test("keeps production files that match", () => {
  const plan = planOverlay(
    [{ externalId: "api-reference/v4/a.mxjson", fileHash: "abc" }],
    [remote("p1", "api-reference/v4/a.mxjson", "abc")],
    2,
  )

  assert.deepEqual(plan.upload, [])
  assert.deepEqual(plan.hidden, [])
})

test("replaces production files with another version or a failed status", () => {
  const plan = planOverlay(
    [
      { externalId: "/w/a.mdx", fileHash: "h" },
      { externalId: "/w/b.mdx", fileHash: "h" },
    ],
    [
      {
        ...remote("p1", "/w/a.mdx", "h"),
        metadata: { file_hash: "h", version: 1 },
      },
      remote("p2", "/w/b.mdx", "h", "failed"),
    ],
    2,
  )

  assert.deepEqual(
    plan.upload.map((file) => file.externalId),
    ["/w/a.mdx", "/w/b.mdx"],
  )
  assert.deepEqual([...plan.hidden].sort(), ["p1", "p2"])
})

test("keys markdown files by their path below the staging directory", () => {
  assert.equal(
    markdownOverlayKey(
      "/home/runner/work/website/website/.data/mixedbread/documentation/v4/a.mdx",
    ),
    ".data/mixedbread/documentation/v4/a.mdx",
  )
  assert.equal(
    markdownOverlayKey(
      "/home/f15u/work/.data/mixedbread/documentation/v4/a.mdx",
    ),
    ".data/mixedbread/documentation/v4/a.mdx",
  )
  assert.equal(
    markdownOverlayKey("api-reference/v4/a.mxjson"),
    "api-reference/v4/a.mxjson",
  )
})

test("syncs only the given markdown files", () => {
  const args = markdownSyncArguments({
    filePatterns: ["/w/.data/mixedbread/documentation/a.mdx"],
    metadata: "{}",
    storeId: "store",
  })

  assert.deepEqual(args.slice(0, 6), [
    "exec",
    "mxbai",
    "store",
    "sync",
    "store",
    "/w/.data/mixedbread/documentation/a.mdx",
  ])
  assert.equal(args[6], "--yes")
})
