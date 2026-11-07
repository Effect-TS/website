import * as Effect from "effect/Effect"
import { assert, test } from "vite-plus/test"
import { HiddenFiles } from "@website/domain"
import { planOverlay } from "../src/ApiReferenceSync.ts"
import {
  markdownOverlayArguments,
  markdownOverlayKey,
} from "../src/MarkdownSync.ts"

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

test("keeps production files that match, with or without the sha256 prefix", () => {
  const plan = planOverlay(
    [{ externalId: "api-reference/v4/a.mxjson", fileHash: "abc" }],
    [remote("p1", "api-reference/v4/a.mxjson", "sha256:abc")],
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

test("encodes hidden file IDs in values below the metadata value limit", () => {
  const ids = Array.from(
    { length: 600 },
    (_, index) => `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
  )

  const metadata = Effect.runSync(HiddenFiles.encode(ids))

  const values = Object.values(metadata)
  assert.isTrue(values.length > 1)
  assert.isTrue(values.every((value) => value.length <= 6_000))
  assert.deepEqual(HiddenFiles.decode(metadata), [...ids].sort())
})

test("decodes nothing from metadata without hidden files", () => {
  assert.deepEqual(
    HiddenFiles.decode({ lifecycle: "pull-request-preview" }),
    [],
  )
  assert.deepEqual(HiddenFiles.decode(null), [])
})

test("fails when hidden file IDs exceed the metadata budget", () => {
  const ids = Array.from(
    { length: 4_000 },
    (_, index) => `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
  )

  const error = Effect.runSync(Effect.flip(HiddenFiles.encode(ids)))

  assert.equal(error._tag, "HiddenFilesTooLargeError")
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

test("syncs only the changed markdown files into a preview store", () => {
  const args = markdownOverlayArguments({
    filePaths: ["/w/.data/mixedbread/documentation/a.mdx"],
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
  assert.isFalse(args.some((arg) => arg.includes("**")))
})
