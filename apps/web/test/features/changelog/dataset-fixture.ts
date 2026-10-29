import { createHash } from "node:crypto"
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { pathToFileURL } from "node:url"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import {
  NpmRegistry,
  type NpmRegistryError,
  type PublishedRelease,
} from "../../../src/features/changelog/npm-registry.ts"

const directories: Array<string> = []

export const removeDatasets = () => {
  for (const directory of directories.splice(0)) {
    rmSync(directory, { recursive: true, force: true })
  }
}

const releasesFile = `${JSON.stringify({
  schemaVersion: 1,
  releases: [
    { version: "4.0.0", date: "2026-10-01", breaking: false, body: "" },
    { version: "3.9.0", date: "2026-09-01", breaking: false, body: "" },
  ],
})}\n`

const changelog = {
  json: "changelog.json",
  sha256: createHash("sha256").update(releasesFile).digest("hex"),
  sourceUrl: "https://github.com/Effect-TS/effect/blob/abc/CHANGELOG.md",
  releaseCount: 2,
  latestDate: "2026-10-01",
}

/** Writes the manifests of a v4 dataset that holds `effect` 4.0.0. */
export function writeDataset(options: { changelog: boolean }) {
  const base = mkdtempSync(join(tmpdir(), "latest-release-"))
  directories.push(base)
  mkdirSync(join(base, "v4", "effect"), { recursive: true })
  writeFileSync(
    join(base, "v4", "effect", "manifest.json"),
    JSON.stringify({
      schemaVersion: 3,
      channel: "v4",
      name: "effect",
      version: "4.0.0",
      revision: "abc",
      description: "The Effect library",
      npmUrl: "https://www.npmjs.com/package/effect",
      sourceUrl: "https://github.com/Effect-TS/effect/tree/abc/packages/effect",
      barrels: [],
      modules: [],
      ...(options.changelog ? { changelog } : {}),
    }),
  )
  writeFileSync(join(base, "v4", "effect", "changelog.json"), releasesFile)
  writeFileSync(
    join(base, "v4", "manifest.json"),
    JSON.stringify({
      datasetSchemaVersion: 1,
      channel: "v4",
      typedocVersion: "0.28.20",
      typedocSchemaVersion: "2.0",
      revision: "abc",
      packages: [
        { name: "effect", version: "4.0.0", manifest: "effect/manifest.json" },
      ],
    }),
  )
  return {
    base: pathToFileURL(`${base}/`),
    channel: "v4",
    slug: "effect",
  }
}

/** An `NpmRegistry` that answers every lookup with `published`. */
export const registryLayer = (
  published: Effect.Effect<PublishedRelease, NpmRegistryError>,
) => Layer.succeed(NpmRegistry, NpmRegistry.of({ published: () => published }))

export const served = (latest: string, dates: Record<string, string>) =>
  Effect.succeed({ latest, dates: new Map(Object.entries(dates)) })
