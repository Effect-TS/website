import { execFileSync } from "node:child_process"
import {
  type Dirent,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs"
import { readFile } from "node:fs/promises"
import { join, relative, sep } from "node:path"
import {
  ChangelogPackage,
  type LatestRelease,
  latestRelease,
  splitChangelog,
} from "@website/domain/Changelog"
import * as Schema from "effect/Schema"
import { packageNameToSlug } from "./ApiReferenceDataset.ts"

export const CHANGELOG_DIRECTORY = "changelog"

export interface ChangelogSource {
  readonly name: string
  readonly version: string
  readonly directory: string
}

/** UTC date (`YYYY-MM-DD`) of every release tag, keyed by tag name. */
function readTagDates(repository: string): Map<string, string> {
  const output = execFileSync(
    "git",
    [
      "for-each-ref",
      "--format=%(refname:strip=2) %(creatordate:iso-strict)",
      "refs/tags",
    ],
    { cwd: repository, encoding: "utf8", maxBuffer: 256 * 1024 * 1024 },
  )
  const dates = new Map<string, string>()
  for (const line of output.split("\n")) {
    const space = line.lastIndexOf(" ")
    if (space === -1) continue
    const time = Date.parse(line.slice(space + 1))
    if (Number.isNaN(time)) continue
    dates.set(line.slice(0, space), new Date(time).toISOString().slice(0, 10))
  }
  return dates
}

/**
 * Write `<output>/changelog/<slug>.json` for every package that has a
 * `CHANGELOG.md`. Release dates come from the `<name>@<version>` git tags, so
 * the repository needs its full history and tags.
 */
export function generateChangelogs(options: {
  readonly channel: string
  readonly output: string
  readonly repository: string
  readonly revision: string
  readonly sources: ReadonlyArray<ChangelogSource>
}): number {
  const tagDates = readTagDates(options.repository)
  const directory = join(options.output, CHANGELOG_DIRECTORY)
  let packages = 0
  let releases = 0
  let dated = 0

  for (const source of options.sources) {
    let markdown: string
    try {
      markdown = readFileSync(join(source.directory, "CHANGELOG.md"), "utf8")
    } catch {
      continue
    }
    const sections = splitChangelog(markdown)
    if (sections.length === 0) continue

    const versions = new Set<string>()
    for (const { version } of sections) {
      if (versions.has(version)) {
        throw new Error(`${source.name} changelog repeats release ${version}`)
      }
      versions.add(version)
    }

    const slug = packageNameToSlug(source.name)
    const sourcePath = relative(
      options.repository,
      join(source.directory, "CHANGELOG.md"),
    )
    const data: ChangelogPackage = {
      schemaVersion: 1,
      channel: options.channel,
      name: source.name,
      slug,
      packageVersion: source.version,
      revision: options.revision,
      sourceUrl: `https://github.com/Effect-TS/effect/blob/${options.revision}/${sourcePath.split(sep).join("/")}`,
      releases: sections.map((section) => {
        const date = tagDates.get(`${source.name}@${section.version}`)
        if (date !== undefined) dated += 1
        return {
          version: section.version,
          ...(date === undefined ? {} : { date }),
          breaking: section.breaking,
          body: section.body,
        }
      }),
    }
    mkdirSync(directory, { recursive: true })
    writeFileSync(
      join(directory, `${slug}.json`),
      `${JSON.stringify(data, null, 2)}\n`,
    )
    packages += 1
    releases += sections.length
  }

  if (releases > 0 && dated === 0) {
    throw new Error(
      `No release tags found in ${options.repository}; fetch the full history and tags to date changelog releases`,
    )
  }
  console.log(
    `Generated ${packages} changelogs (${releases} releases, ${dated} dated) in ${directory}`,
  )
  return packages
}

function readNames(
  directory: string,
  include: (entry: Dirent) => boolean,
): Array<string> {
  try {
    return readdirSync(directory, { withFileTypes: true })
      .filter(include)
      .map((entry) => entry.name)
      .sort()
  } catch (cause) {
    if ((cause as NodeJS.ErrnoException).code === "ENOENT") return []
    throw cause
  }
}

function readDatasetRevision(channelDirectory: string): string | undefined {
  try {
    const manifest: unknown = JSON.parse(
      readFileSync(join(channelDirectory, "manifest.json"), "utf8"),
    )
    const revision =
      typeof manifest === "object" && manifest !== null
        ? Reflect.get(manifest, "revision")
        : undefined
    return typeof revision === "string" ? revision : undefined
  } catch {
    return undefined
  }
}

const decodeChangelogPackage = Schema.decodeUnknownSync(ChangelogPackage)

async function readChangelog(
  baseDirectory: string,
  channel: string,
  name: string,
): Promise<{ readonly data: ChangelogPackage; readonly path: string }> {
  const path = join(baseDirectory, channel, CHANGELOG_DIRECTORY, name)
  const data = decodeChangelogPackage(JSON.parse(await readFile(path, "utf8")))
  if (data.channel !== channel || `${data.slug}.json` !== name) {
    throw new Error(`Changelog does not match its location: ${path}`)
  }
  // One snapshot, one revision: pages must not show versions that the API
  // reference next to them does not have.
  const revision = readDatasetRevision(join(baseDirectory, channel))
  if (revision !== undefined && data.revision !== revision) {
    throw new Error(
      `Changelog ${path} comes from revision ${data.revision}, but the ${channel} API reference comes from ${revision}; generate them together`,
    )
  }
  return { data, path }
}

/** Load every generated changelog under `<baseDirectory>/<channel>/changelog`. */
export async function loadChangelogDataset(
  baseDirectory: string,
): Promise<
  ReadonlyArray<{ readonly data: ChangelogPackage; readonly path: string }>
> {
  const entries: Array<{ data: ChangelogPackage; path: string }> = []
  for (const channel of readNames(baseDirectory, (entry) =>
    entry.isDirectory(),
  )) {
    const directory = join(baseDirectory, channel, CHANGELOG_DIRECTORY)
    for (const name of readNames(directory, (entry) =>
      entry.name.endsWith(".json"),
    )) {
      entries.push(await readChangelog(baseDirectory, channel, name))
    }
  }
  return entries
}

/** The release one package's page and navbar show, or undefined without data. */
export async function loadLatestRelease(
  baseDirectory: string,
  channel: string,
  slug: string,
): Promise<LatestRelease | undefined> {
  const [name] = readNames(
    join(baseDirectory, channel, CHANGELOG_DIRECTORY),
    (entry) => entry.name === `${slug}.json`,
  )
  return name === undefined
    ? undefined
    : latestRelease((await readChangelog(baseDirectory, channel, name)).data)
}
