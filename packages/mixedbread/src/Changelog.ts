import * as Schema from "effect/Schema"
import {
  countLines,
  frontmatterLines,
  parseCommonMark,
  sections,
  serializeSearchFrontmatter,
  spliceFrontmatter,
} from "./Markdown.ts"
import { isSemver } from "@website/domain/Changelog"
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
