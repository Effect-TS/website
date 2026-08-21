import { execFileSync } from "node:child_process"
import { createHash } from "node:crypto"
import {
  chmodSync,
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

const script = fileURLToPath(new URL("../src/cli.ts", import.meta.url))
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

test("packages verified API reference snapshot assets", () => {
  const directory = mkdtempSync(join(tmpdir(), "api-reference-package-"))
  try {
    const data = join(directory, "api-reference")
    const assets = join(directory, "assets")
    writeDataset(data, "v3", v3)
    writeDataset(data, "v4", v4)
    const id = run("id", "--v3", v3, "--v4", v4, "--generator", generator)

    assert.equal(
      run(
        "package",
        "--data",
        data,
        "--output",
        assets,
        "--v3",
        v3,
        "--v4",
        v4,
        "--generator",
        generator,
        "--website-revision",
        websiteRevision,
        "--expected-id",
        id,
      ),
      id,
    )

    const archive = readFileSync(join(assets, "api-reference.tar.gz"))
    const checksum = createHash("sha256").update(archive).digest("hex")
    assert.equal(
      readFileSync(join(assets, "api-reference.sha256"), "utf8"),
      `${checksum}  api-reference.tar.gz\n`,
    )
    assert.equal(
      JSON.parse(readFileSync(join(assets, "manifest.json"), "utf8"))
        .snapshotId,
      id,
    )
    assert.match(
      execFileSync("tar", ["-tzf", join(assets, "api-reference.tar.gz")], {
        encoding: "utf8",
      }),
      /api-reference\/v3\/manifest\.json/,
    )
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})

test("prepares, resolves, and publishes snapshot releases", () => {
  const directory = mkdtempSync(join(tmpdir(), "api-reference-release-"))
  try {
    const bin = join(directory, "bin")
    const log = join(directory, "gh.log")
    mkdirSync(bin)
    writeFileSync(
      join(bin, "gh"),
      `#!/usr/bin/env node
import { appendFileSync, writeFileSync } from "node:fs"

const arguments_ = process.argv.slice(2)
appendFileSync(process.env.GH_LOG, arguments_.join(" ") + "\\n")
if (arguments_[0] === "repo" && arguments_[1] === "view") {
  process.stdout.write('{"nameWithOwner":"effect-ts/website"}')
} else if (arguments_[0] === "api") {
  process.stdout.write(process.env.GH_RELEASES ?? "[]")
} else if (arguments_[0] === "release" && arguments_[1] === "view") {
  if (process.env.GH_RELEASE_STATE === undefined) {
    console.error("release not found")
    process.exit(1)
  }
  process.stdout.write(process.env.GH_RELEASE_STATE)
} else if (arguments_[0] === "release" && arguments_[1] === "download") {
  const directory = arguments_[arguments_.indexOf("--dir") + 1]
  writeFileSync(directory + "/manifest.json", process.env.GH_MANIFEST)
}
`,
    )
    chmodSync(join(bin, "gh"), 0o755)

    const id = run("id", "--v3", v3, "--v4", v4, "--generator", generator)
    const tag = `api-reference-${id}`
    const baseEnvironment = {
      ...process.env,
      GH_LOG: log,
      PATH: `${bin}:${process.env.PATH}`,
    }
    const publishedEnvironment = {
      ...baseEnvironment,
      GH_RELEASE_STATE: JSON.stringify({
        isDraft: false,
        isPrerelease: false,
      }),
    }

    assert.equal(
      runWithEnvironment(
        publishedEnvironment,
        "resolve",
        "--repository",
        "effect-ts/website",
        "--tag",
        tag,
      ),
      tag,
    )

    assert.match(
      runWithEnvironment(
        publishedEnvironment,
        "prepare",
        "--event-name",
        "workflow_dispatch",
        "--repository",
        "effect-ts/website",
        "--v3",
        v3,
        "--v4",
        v4,
        "--generator",
        generator,
      ),
      new RegExp(`tag=${tag}\\npublished=true`),
    )

    const nextV3 = "e".repeat(40)
    const previousId = run(
      "id",
      "--v3",
      v3,
      "--v4",
      v4,
      "--generator",
      generator,
    )
    const previousTag = `api-reference-${previousId}`
    const dispatch = runWithEnvironment(
      {
        ...baseEnvironment,
        GH_MANIFEST: JSON.stringify({
          schemaVersion: 1,
          snapshotId: previousId,
          generatedAt: "2026-08-21T00:00:00.000Z",
          websiteRevision,
          generator,
          channels: { v3: { revision: v3 }, v4: { revision: v4 } },
        }),
        GH_RELEASES: JSON.stringify([
          {
            draft: false,
            prerelease: false,
            published_at: "2026-08-21T00:00:00Z",
            tag_name: previousTag,
          },
        ]),
      },
      "prepare",
      "--event-name",
      "repository_dispatch",
      "--event-repository",
      "Effect-TS/effect",
      "--event-channel",
      "v3",
      "--event-revision",
      nextV3,
      "--repository",
      "effect-ts/website",
      "--v3",
      "",
      "--v4",
      "",
      "--generator",
      generator,
    )
    assert.match(dispatch, new RegExp(`v3=${nextV3}\\nv4=${v4}`))
    assert.match(dispatch, /published=false/)

    const data = join(directory, "api-reference")
    const assets = join(directory, "assets")
    writeDataset(data, "v3", v3)
    writeDataset(data, "v4", v4)
    run(
      "package",
      "--data",
      data,
      "--output",
      assets,
      "--v3",
      v3,
      "--v4",
      v4,
      "--generator",
      generator,
      "--website-revision",
      websiteRevision,
      "--expected-id",
      id,
    )

    assert.equal(
      runWithEnvironment(
        {
          ...baseEnvironment,
          GH_RELEASE_STATE: JSON.stringify({
            isDraft: true,
            isPrerelease: false,
          }),
        },
        "publish",
        "--repository",
        "effect-ts/website",
        "--assets",
        assets,
        "--v3",
        v3,
        "--v4",
        v4,
        "--generator",
        generator,
        "--expected-id",
        id,
      ),
      tag,
    )
    const calls = readFileSync(log, "utf8")
    assert.match(calls, new RegExp(`release delete ${tag}`))
    assert.match(calls, new RegExp(`release create ${tag}`))
    assert.match(calls, new RegExp(`release upload ${tag}`))
    assert.match(calls, new RegExp(`release edit ${tag}`))
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
  return runWithEnvironment(process.env, ...arguments_)
}

function runWithEnvironment(env, ...arguments_) {
  return execFileSync(process.execPath, [script, "snapshot", ...arguments_], {
    encoding: "utf8",
    env,
    stdio: ["ignore", "pipe", "pipe"],
  })
}
