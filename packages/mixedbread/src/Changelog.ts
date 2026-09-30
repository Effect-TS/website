import * as Schema from "effect/Schema"
import { stringify as stringifyYaml } from "yaml"
import {
  countLines,
  frontmatterLines,
  parseCommonMark,
  sections,
  serializeSearchFrontmatter,
  spliceFrontmatter,
} from "./Markdown.ts"
import {
  type ChangelogSection,
  isSemver,
  splitChangelogSections,
} from "@website/domain/Changelog"
import { ChangelogStagedSearchMetadata } from "@website/domain/SearchMetadata"

export const SearchMetadata = ChangelogStagedSearchMetadata
export type SearchMetadata = typeof ChangelogStagedSearchMetadata.Type

const Frontmatter = Schema.Struct({
  package: Schema.String,
  slug: Schema.String,
  channel: Schema.String,
  packageVersion: Schema.String,
})
const FrontmatterRecord = Schema.Record(Schema.String, Schema.Unknown)

export interface StagedChangelog {
  readonly source: string
  readonly metadata: SearchMetadata
}

export interface StagedChangelogRelease extends StagedChangelog {
  readonly version: string
}

// Index one document per release instead of one per package. A package-wide
// document carries a section table and a `versions` list that both grow with
// release count, so a long history overflows the Mixedbread metadata cap. A
// release-scoped document keeps its frontmatter bounded and only re-uploads
// when that single release changes.
export function stageChangelogReleases(
  source: string,
  relativePath: string,
): ReadonlyArray<StagedChangelogRelease> {
  const parsed = parseCommonMark(
    source,
    "Changelog file must have YAML frontmatter",
  )
  const frontmatter = Schema.decodeUnknownSync(Frontmatter)(parsed.frontmatter)
  const result: Array<StagedChangelogRelease> = []
  for (const release of splitChangelogSections(source)) {
    const staged = stageChangelog(
      releaseSource(frontmatter, release),
      `${relativePath}#${release.version}`,
    )
    if (staged === undefined) continue
    result.push({ ...staged, version: release.version })
  }
  return result
}

function releaseSource(
  frontmatter: typeof Frontmatter.Type,
  release: ChangelogSection,
): string {
  const yaml = stringifyYaml(
    {
      package: frontmatter.package,
      slug: frontmatter.slug,
      channel: frontmatter.channel,
      packageVersion: release.version,
    },
    { lineWidth: 0 },
  ).trimEnd()
  const body = [release.heading, ...release.body].join("\n").trimEnd()
  return `---\n${yaml}\n---\n\n${body}\n`
}

export function stageChangelog(
  source: string,
  relativePath: string,
): StagedChangelog | undefined {
  const parsed = parseCommonMark(
    source,
    "Changelog file must have YAML frontmatter",
  )
  const frontmatter = Schema.decodeUnknownSync(Frontmatter)(parsed.frontmatter)
  const frontmatterRecord = Schema.decodeUnknownSync(FrontmatterRecord)(
    parsed.frontmatter,
  )

  const pageHref = `/docs/${frontmatter.channel}/api/${frontmatter.slug}/changelog`
  // Slug every heading in order so anchors match rehype, then keep the root and
  // released-version (level-2 semver) headings as the searchable sections.
  const originalSections = sections(
    parsed.tree,
    frontmatter.package,
    undefined,
  ).filter(
    (section, index) =>
      index === 0 || (section.level === 2 && isSemver(section.title)),
  )
  if (originalSections.length <= 1) return undefined

  const baseMetadata: SearchMetadata = {
    schema_version: 1,
    content_source: "changelog",
    docs_version: frontmatter.channel,
    package_name: frontmatter.package,
    package_slug: frontmatter.slug,
    page_href: pageHref,
    page_title: frontmatter.package,
    sections: originalSections,
  }
  const provisionalFrontmatter = serializeSearchFrontmatter(
    frontmatterRecord,
    baseMetadata,
    "changelog",
  )
  const lineDelta =
    countLines(provisionalFrontmatter) -
    frontmatterLines(parsed, "YAML frontmatter is missing source lines")
  const metadata: SearchMetadata = {
    ...baseMetadata,
    sections: originalSections.map((section) => ({
      ...section,
      line: section.line === 1 ? 1 : section.line + lineDelta,
    })),
  }
  const finalFrontmatter = serializeSearchFrontmatter(
    frontmatterRecord,
    metadata,
    "changelog",
  )
  if (countLines(finalFrontmatter) !== countLines(provisionalFrontmatter)) {
    throw new Error(
      `Changelog metadata changed frontmatter height for ${relativePath}`,
    )
  }
  return {
    source: spliceFrontmatter(
      source,
      parsed,
      finalFrontmatter,
      "YAML frontmatter is missing source offsets",
    ),
    metadata,
  }
}
