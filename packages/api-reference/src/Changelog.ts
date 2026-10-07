import { execFileSync } from "node:child_process"
import { createHash } from "node:crypto"
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join, relative, sep } from "node:path"
import type { ApiReferenceChangelogSummary } from "@website/domain/ApiReference"
import type { ChangelogFile } from "@website/domain/Changelog"
import { splitChangelog } from "@website/domain/Changelog"

export const CHANGELOG_FILE = "changelog.json"

export interface ChangelogSource {
  readonly name: string
  readonly version: string
  /** The package directory in the Effect repository. */
  readonly directory: string
  /** The package directory in the generated dataset. */
  readonly outputDirectory: string
}

export interface ChangelogWriter {
  /** Write the package's releases; undefined when it has no changelog. */
  readonly write: (
    source: ChangelogSource,
  ) => ApiReferenceChangelogSummary | undefined
  /** Fail when no release got a date: the repository lacks its tags. */
  readonly finish: () => void
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
 * Write each package's `CHANGELOG.md` as `changelog.json` next to its manifest,
 * and return what the manifest records about it. Release dates come from the
 * `<name>@<version>` git tags, so the repository needs its full history.
 */
export function createChangelogWriter(options: {
  readonly repository: string
  readonly revision: string
}): ChangelogWriter {
  let tagDates: Map<string, string> | undefined
  let releases = 0
  let dated = 0

  return {
    write(source) {
      let markdown: string
      try {
        markdown = readFileSync(join(source.directory, "CHANGELOG.md"), "utf8")
      } catch {
        return undefined
      }
      const sections = splitChangelog(markdown)
      if (sections.length === 0) return undefined

      const versions = new Set<string>()
      for (const { version } of sections) {
        if (versions.has(version)) {
          throw new Error(`${source.name} changelog repeats release ${version}`)
        }
        versions.add(version)
      }

      tagDates ??= readTagDates(options.repository)
      const file: ChangelogFile = {
        schemaVersion: 1,
        releases: sections.map((section) => {
          const date = tagDates?.get(`${source.name}@${section.version}`)
          if (date !== undefined) dated += 1
          return {
            version: section.version,
            ...(date === undefined ? {} : { date }),
            breaking: section.breaking,
            body: section.body,
          }
        }),
      }
      releases += file.releases.length

      const contents = `${JSON.stringify(file, null, 2)}\n`
      const path = join(source.outputDirectory, CHANGELOG_FILE)
      mkdirSync(dirname(path), { recursive: true })
      writeFileSync(path, contents)

      const sourcePath = relative(
        options.repository,
        join(source.directory, "CHANGELOG.md"),
      )
      const latestDate = file.releases.find(
        (release) => release.version === source.version,
      )?.date
      return {
        json: CHANGELOG_FILE,
        sha256: createHash("sha256").update(contents).digest("hex"),
        sourceUrl: `https://github.com/Effect-TS/effect/blob/${options.revision}/${sourcePath.split(sep).join("/")}`,
        releaseCount: file.releases.length,
        ...(latestDate === undefined ? {} : { latestDate }),
      }
    },
    finish() {
      if (releases > 0 && dated === 0) {
        throw new Error(
          `No release tags found in ${options.repository}; fetch the full history and tags to date changelog releases`,
        )
      }
      console.log(`Generated changelogs (${releases} releases, ${dated} dated)`)
    },
  }
}
