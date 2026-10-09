import { createHash } from "node:crypto"
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  utimesSync,
  writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, assert, describe, test } from "vite-plus/test"
import {
  loadApiReferenceDataset,
  loadChangelogReleases,
  readApiReferenceDataset,
} from "../src/ApiReferenceDataset.ts"

const directories: Array<string> = []
afterEach(() => {
  for (const directory of directories.splice(0)) {
    rmSync(directory, { recursive: true, force: true })
  }
})

const releases = `${JSON.stringify({
  schemaVersion: 1,
  releases: [
    { version: "4.0.1", date: "2026-10-04", breaking: false, body: "- Fix." },
  ],
})}\n`

function dataset(options: { changelog?: boolean; revision?: string } = {}) {
  const base = mkdtempSync(join(tmpdir(), "api-dataset-"))
  directories.push(base)
  const channel = join(base, "v4")
  const packageDirectory = join(channel, "@effect", "sql-pg")
  mkdirSync(packageDirectory, { recursive: true })
  const revision = options.revision ?? "abc"
  writeFileSync(join(packageDirectory, "changelog.json"), releases)
  writeFileSync(
    join(packageDirectory, "manifest.json"),
    JSON.stringify({
      schemaVersion: 3,
      channel: "v4",
      name: "@effect/sql-pg",
      version: "4.0.1",
      revision,
      description: "A PostgreSQL toolkit",
      npmUrl: "https://www.npmjs.com/package/@effect/sql-pg",
      sourceUrl: "https://github.com/Effect-TS/effect/tree/abc/packages/sql/pg",
      barrels: [],
      modules: [],
      ...(options.changelog === false
        ? {}
        : {
            changelog: {
              json: "changelog.json",
              sha256: createHash("sha256").update(releases).digest("hex"),
              sourceUrl:
                "https://github.com/Effect-TS/effect/blob/abc/CHANGELOG.md",
              releaseCount: 1,
              latestDate: "2026-10-04",
            },
          }),
    }),
  )
  const writeDatasetManifest = () =>
    writeFileSync(
      join(channel, "manifest.json"),
      JSON.stringify({
        datasetSchemaVersion: 1,
        channel: "v4",
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
  writeDatasetManifest()
  return { base, channel, writeDatasetManifest }
}

describe("readApiReferenceDataset", () => {
  test("reads package identity and the changelog summary from the manifest", async () => {
    const { base } = dataset()
    const { packages } = await readApiReferenceDataset(base)

    assert.lengthOf(packages, 1)
    assert.deepInclude(packages[0], {
      channel: "v4",
      name: "@effect/sql-pg",
      slug: "sql-pg",
      version: "4.0.1",
      revision: "abc",
    })
    assert.deepInclude(packages[0]?.changelog, {
      path: join("v4", "@effect", "sql-pg", "changelog.json"),
      releaseCount: 1,
      latestDate: "2026-10-04",
    })
  })

  test("still reads datasets published before changelogs", async () => {
    const { base } = dataset({ changelog: false })
    const { packages } = await readApiReferenceDataset(base)
    assert.isUndefined(packages[0]?.changelog)
  })

  test("reads the manifests once for everyone who asks", async () => {
    const { base } = dataset()
    const first = await readApiReferenceDataset(base)
    assert.strictEqual(await readApiReferenceDataset(base), first)
    assert.strictEqual(await loadApiReferenceDataset(base), first.modules)
  })

  test("reads again after the generator rewrites the dataset manifest", async () => {
    const { base, channel, writeDatasetManifest } = dataset()
    const first = await readApiReferenceDataset(base)

    writeDatasetManifest()
    const later = new Date(Date.now() + 5_000)
    utimesSync(join(channel, "manifest.json"), later, later)

    assert.notStrictEqual(await readApiReferenceDataset(base), first)
  })

  test("rejects a package manifest from another revision", async () => {
    const { base } = dataset({ revision: "def" })
    let failure: unknown
    await readApiReferenceDataset(base).catch((error: unknown) => {
      failure = error
    })
    assert.match(String(failure), /does not match its dataset entry/)
    // A failure is not cached.
    await readApiReferenceDataset(base).then(
      () => assert.fail("expected the second read to fail too"),
      () => undefined,
    )
  })
})

describe("loadChangelogReleases", () => {
  test("reads the releases the manifest names", async () => {
    const { base } = dataset()
    const [pkg] = (await readApiReferenceDataset(base)).packages
    const releasesOf = await loadChangelogReleases(
      { jsonPath: pkg!.changelog!.path, sha256: pkg!.changelog!.sha256 },
      { baseDirectory: base },
    )
    assert.deepStrictEqual(
      releasesOf.map(({ version }) => version),
      ["4.0.1"],
    )
  })

  test("rejects a file that does not match its checksum", async () => {
    const { base } = dataset()
    const [pkg] = (await readApiReferenceDataset(base)).packages
    let failure: unknown
    await loadChangelogReleases(
      { jsonPath: pkg!.changelog!.path, sha256: "0".repeat(64) },
      { baseDirectory: base },
    ).catch((error: unknown) => {
      failure = error
    })
    assert.match(String(failure), /checksum mismatch/)
  })

  test("rejects a path outside the dataset", async () => {
    const { base } = dataset()
    let failure: unknown
    await loadChangelogReleases(
      { jsonPath: "../outside.json", sha256: "0".repeat(64) },
      { baseDirectory: base },
    ).catch((error: unknown) => {
      failure = error
    })
    assert.match(String(failure), /escapes its dataset/)
  })
})
