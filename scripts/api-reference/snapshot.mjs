import { createHash } from "node:crypto"
import { readFileSync, writeFileSync } from "node:fs"
import { join, resolve } from "node:path"

const revisionPattern = /^[a-f0-9]{40}$/
const digestPattern = /^[a-f0-9]{40,64}$/
const [command, ...arguments_] = process.argv.slice(2)
const options = parseOptions(arguments_)

switch (command) {
  case "id": {
    const v3 = requiredRevision("v3")
    const v4 = requiredRevision("v4")
    const generator = requiredDigest("generator")
    process.stdout.write(snapshotId({ generator, v3, v4 }))
    break
  }
  case "create": {
    const dataDirectory = resolve(requiredOption("data"))
    const output = resolve(requiredOption("output"))
    const v3 = requiredRevision("v3")
    const v4 = requiredRevision("v4")
    const generator = requiredDigest("generator")
    const id = snapshotId({ generator, v3, v4 })
    validateDatasets(dataDirectory, { v3, v4 })
    writeFileSync(
      output,
      `${JSON.stringify(
        {
          schemaVersion: 1,
          snapshotId: id,
          generatedAt: new Date().toISOString(),
          websiteRevision: requiredRevision("website-revision"),
          generator,
          channels: { v3: { revision: v3 }, v4: { revision: v4 } },
        },
        null,
        2,
      )}\n`,
    )
    break
  }
  case "validate": {
    const dataDirectory = resolve(requiredOption("data"))
    const manifest = readJson(resolve(requiredOption("manifest")))
    if (!isRecord(manifest) || manifest.schemaVersion !== 1) {
      throw new Error("API reference snapshot manifest has an unsupported schema")
    }
    const id = requiredString(manifest, "snapshotId", digestPattern)
    const generator = requiredString(manifest, "generator", digestPattern)
    const channels = requiredRecord(manifest, "channels")
    const v3 = requiredString(requiredRecord(channels, "v3"), "revision", revisionPattern)
    const v4 = requiredString(requiredRecord(channels, "v4"), "revision", revisionPattern)
    const expectedId = snapshotId({ generator, v3, v4 })
    if (id !== expectedId) {
      throw new Error(`API reference snapshot ID mismatch: expected ${expectedId}, received ${id}`)
    }
    validateDatasets(dataDirectory, { v3, v4 })
    process.stdout.write(id)
    break
  }
  default:
    throw new Error(`Unknown snapshot command: ${command ?? "<missing>"}`)
}

function snapshotId({ generator, v3, v4 }) {
  return createHash("sha256")
    .update(JSON.stringify({ schemaVersion: 1, generator, channels: { v3, v4 } }))
    .digest("hex")
}

function validateDatasets(dataDirectory, revisions) {
  for (const channel of ["v3", "v4"]) {
    const manifestPath = join(dataDirectory, channel, "manifest.json")
    const manifest = readJson(manifestPath)
    if (!isRecord(manifest) || manifest.datasetSchemaVersion !== 1) {
      throw new Error(`API reference dataset has an unsupported schema: ${manifestPath}`)
    }
    if (manifest.channel !== channel) {
      throw new Error(`API reference dataset channel mismatch: ${manifestPath}`)
    }
    if (manifest.revision !== revisions[channel]) {
      throw new Error(
        `API reference dataset revision mismatch for ${channel}: expected ${revisions[channel]}, received ${String(manifest.revision)}`,
      )
    }
  }
}

function parseOptions(arguments_) {
  const parsed = new Map()
  for (let index = 0; index < arguments_.length; index += 2) {
    const name = arguments_[index]
    const value = arguments_[index + 1]
    if (name === undefined || !name.startsWith("--") || value === undefined) {
      throw new Error(`Invalid snapshot option near ${name ?? "<missing>"}`)
    }
    parsed.set(name.slice(2), value)
  }
  return parsed
}

function requiredOption(name) {
  const value = options.get(name)
  if (value === undefined || value.length === 0) throw new Error(`Missing --${name}`)
  return value
}

function requiredRevision(name) {
  const value = requiredOption(name)
  if (!revisionPattern.test(value)) throw new Error(`--${name} must be a full Git commit SHA`)
  return value
}

function requiredDigest(name) {
  const value = requiredOption(name)
  if (!digestPattern.test(value)) throw new Error(`--${name} must be a hexadecimal digest`)
  return value
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"))
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function requiredRecord(record, key) {
  const value = record[key]
  if (!isRecord(value)) throw new Error(`API reference snapshot manifest is missing ${key}`)
  return value
}

function requiredString(record, key, pattern) {
  const value = record[key]
  if (typeof value !== "string" || !pattern.test(value)) {
    throw new Error(`API reference snapshot manifest has an invalid ${key}`)
  }
  return value
}
