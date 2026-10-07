import { createHash } from "node:crypto"
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import type { ChangelogRelease } from "@website/domain/Changelog"
import * as Effect from "effect/Effect"
import { assert, describe, test } from "vite-plus/test"
import {
  generateChangelogFiles,
  releaseChunks,
  searchBody,
  splitText,
} from "../src/ChangelogFiles.ts"
import { shardChunks } from "../src/ChunkFiles.ts"
import {
  MAX_CHANGELOG_CHUNK_LENGTH,
  MAX_CHUNKS_PER_FILE,
  MAX_MIXEDBREAD_TEXT_LENGTH,
} from "../src/Config.ts"

const prefix =
  "[#8679](https://github.com/Effect-TS/effect/pull/8679) [`888e326`](https://github.com/Effect-TS/effect/commit/888e326a3180aea9b117fe7c97aace5dd527596e) Thanks @tim-smart! - "
const dependencies =
  "- Updated dependencies [[`ed2cc2f`](https://github.com/Effect-TS/effect/commit/ed2cc2f322dfd24da550c8d0ac811c3130b79d74)]:\n  - effect@4.0.1"

const pkg = { channel: "v4", name: "@effect/sql-pg", slug: "sql-pg" }

const changelog = (
  releases: ReadonlyArray<{ version: string; body: string }>,
): Array<ChangelogRelease> =>
  releases.map(({ version, body }) => ({ version, breaking: false, body }))

describe("searchBody", () => {
  test("drops commit links, authors and dependency lists", () => {
    const body = `### Patch Changes\n\n- ${prefix}Raise the idle timeout.\n${dependencies}`
    assert.strictEqual(
      searchBody(body),
      "### Patch Changes\n\n- Raise the idle timeout.",
    )
  })

  test("returns nothing for dependency-only releases", () => {
    assert.strictEqual(searchBody(`### Patch Changes\n\n${dependencies}`), "")
  })

  test("drops headings left without entries", () => {
    const body = `### Major Changes\n\n- v4 beta\n\n### Patch Changes\n\n${dependencies}`
    assert.strictEqual(searchBody(body), "### Major Changes\n\n- v4 beta")
  })
})

describe("splitText", () => {
  test("keeps every part within the limit, even for one long line", () => {
    const parts = splitText(`${"word ".repeat(1_000)}\nshort`, 100)
    assert.isTrue(parts.length > 1)
    assert.isTrue(parts.every((part) => part.length <= 100))
    assert.strictEqual(
      parts.join(" ").replace(/\s+/g, " "),
      `${"word ".repeat(1_000)} short`.replace(/\s+/g, " "),
    )
  })
})

describe("releaseChunks", () => {
  test("emits oldest release first and skips dependency-only releases", () => {
    const chunks = releaseChunks(
      pkg,
      changelog([
        { version: "4.0.2", body: `### Patch Changes\n\n${dependencies}` },
        { version: "4.0.1", body: "### Patch Changes\n\n- Fix pool leak." },
        { version: "4.0.0", body: "### Major Changes\n\n- First release." },
      ]),
    )
    assert.deepStrictEqual(
      chunks.map((chunk) => chunk.generated_metadata.version),
      ["4.0.0", "4.0.1"],
    )
    assert.strictEqual(
      chunks[0]?.generated_metadata.page_href,
      "/docs/v4/api/sql-pg/changelog",
    )
    assert.include(chunks[0]?.text, "# @effect/sql-pg 4.0.0")
  })
})

describe("growth guard", () => {
  // Newest first, like a Changesets file; each release depends only on its number.
  const releases = (count: number) =>
    Array.from({ length: count }, (_, number) => ({
      version: `4.0.0-rc.${number}`,
      body: `### Patch Changes\n\n- ${"Change description. ".repeat(30 + (number % 40))}\n- ${number === 3 ? "x ".repeat(50_000) : "Another change."}`,
    })).reverse()

  test("keeps chunks and files inside their budgets for a large package", () => {
    const chunks = releaseChunks(pkg, changelog(releases(600)))
    assert.isTrue(
      chunks.every((chunk) => chunk.text.length <= MAX_CHANGELOG_CHUNK_LENGTH),
    )
    assert.isBelow(MAX_CHANGELOG_CHUNK_LENGTH, MAX_MIXEDBREAD_TEXT_LENGTH)
    assert.isTrue(
      shardChunks(chunks).every((shard) => shard.length <= MAX_CHUNKS_PER_FILE),
    )
  })

  test("a new release changes only the newest shard", () => {
    const before = shardChunks(releaseChunks(pkg, changelog(releases(600))))
    const after = shardChunks(releaseChunks(pkg, changelog(releases(601))))
    assert.isTrue(after.length >= before.length)
    assert.deepStrictEqual(
      after
        .slice(0, -1)
        .map(shardJson)
        .slice(0, before.length - 1),
      before.slice(0, -1).map(shardJson),
    )
  })
})

const shardJson = (shard: ReadonlyArray<unknown>) => JSON.stringify(shard)

describe("generateChangelogFiles", () => {
  const hash = (bytes: Uint8Array) =>
    Effect.succeed(createHash("sha256").update(bytes).digest("hex"))

  // Writes the manifests the way the generator does.
  function writeDataset(
    directory: string,
    channel: string,
    releases: ReadonlyArray<ChangelogRelease>,
  ) {
    const packageDirectory = join(directory, channel, "@effect", "sql-pg")
    mkdirSync(packageDirectory, { recursive: true })
    const contents = `${JSON.stringify({ schemaVersion: 1, releases })}\n`
    writeFileSync(join(packageDirectory, "changelog.json"), contents)
    writeFileSync(
      join(packageDirectory, "manifest.json"),
      JSON.stringify({
        schemaVersion: 3,
        channel,
        name: "@effect/sql-pg",
        version: "4.0.1",
        revision: "abc",
        description: "A PostgreSQL toolkit",
        npmUrl: "https://www.npmjs.com/package/@effect/sql-pg",
        sourceUrl:
          "https://github.com/Effect-TS/effect/tree/abc/packages/sql/pg",
        barrels: [],
        modules: [],
        changelog: {
          json: "changelog.json",
          sha256: createHash("sha256").update(contents).digest("hex"),
          sourceUrl:
            "https://github.com/Effect-TS/effect/blob/abc/CHANGELOG.md",
          releaseCount: releases.length,
        },
      }),
    )
    writeFileSync(
      join(directory, channel, "manifest.json"),
      JSON.stringify({
        datasetSchemaVersion: 1,
        channel,
        typedocVersion: "0.28.20",
        typedocSchemaVersion: "2.0",
        revision: "abc",
        packages: [
          {
            name: "@effect/sql-pg",
            version: "4.0.1",
            manifest: "@effect/sql-pg/manifest.json",
          },
        ],
      }),
    )
  }

  test("builds sharded files for indexed channels only", async () => {
    const directory = mkdtempSync(join(tmpdir(), "changelog-files-"))
    try {
      const releases = changelog([
        { version: "4.0.1", body: "### Patch Changes\n\n- Fix pool leak." },
      ])
      writeDataset(directory, "v4", releases)
      writeDataset(directory, "v3", releases)

      const run = () =>
        Effect.runPromise(generateChangelogFiles(directory, hash))
      const files = await run()

      assert.deepStrictEqual(
        files.map((file) => file.externalId),
        ["api-reference/v4/sql-pg-changelog-001.mxjson"],
      )
      assert.deepStrictEqual(files[0]?.metadata, {
        channel: "v4",
        content_source: "changelog",
        package_name: "@effect/sql-pg",
        package_slug: "sql-pg",
      })
      assert.deepStrictEqual(
        (await run()).map((file) => file.fileHash),
        files.map((file) => file.fileHash),
      )
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  })

  test("returns nothing when no changelog data exists", async () => {
    const files = await Effect.runPromise(
      generateChangelogFiles(join(tmpdir(), "missing-changelog-dir"), hash),
    )
    assert.deepStrictEqual(files, [])
  })
})
