import { execFileSync } from "node:child_process"
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { assert, test } from "vite-plus/test"

const script = fileURLToPath(new URL("../src/cli.mjs", import.meta.url))
const v3 = "a".repeat(40)
const v4 = "b".repeat(40)
const generator = "c".repeat(40)
const websiteRevision = "d".repeat(40)

test("creates and validates a deterministic API reference snapshot", () => {
  const directory = mkdtempSync(join(tmpdir(), "api-reference-snapshot-"))
  try {
    const data = join(directory, "api-reference")
    writeDataset(data, "v3", v3)
    writeDataset(data, "v4", v4)
    const manifest = join(directory, "manifest.json")
    const id = run("id", "--v3", v3, "--v4", v4, "--generator", generator)

    run(
      "create",
      "--data",
      data,
      "--output",
      manifest,
      "--v3",
      v3,
      "--v4",
      v4,
      "--generator",
      generator,
      "--website-revision",
      websiteRevision,
    )

    assert.equal(run("validate", "--data", data, "--manifest", manifest), id)
    assert.equal(JSON.parse(readFileSync(manifest, "utf8")).snapshotId, id)

    writeDataset(data, "v4", "e".repeat(40))
    assert.throws(() => run("validate", "--data", data, "--manifest", manifest))
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})

function writeDataset(directory, channel, revision) {
  const channelDirectory = join(directory, channel)
  mkdirSync(channelDirectory, { recursive: true })
  writeFileSync(
    join(channelDirectory, "manifest.json"),
    JSON.stringify({ datasetSchemaVersion: 1, channel, revision }),
  )
}

function run(...arguments_) {
  return execFileSync(process.execPath, [script, "snapshot", ...arguments_], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  })
}
