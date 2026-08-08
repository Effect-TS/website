import * as Schema from "effect/Schema"
import {
  countLines,
  frontmatterLines,
  parseMarkdown,
  sections,
  serializeSearchFrontmatter,
  spliceFrontmatter,
} from "./Markdown.ts"
import {
  DocumentationStagedSearchMetadata,
  SearchSection,
} from "@website/domain/SearchMetadata"

export const SearchMetadata = DocumentationStagedSearchMetadata
export { SearchSection }
export type SearchMetadata = typeof DocumentationStagedSearchMetadata.Type

const Frontmatter = Schema.Struct({
  title: Schema.String,
  description: Schema.optional(Schema.String),
  draft: Schema.optional(Schema.Boolean),
  sidebar: Schema.optional(
    Schema.Struct({ label: Schema.optional(Schema.String) }),
  ),
})
const FrontmatterRecord = Schema.Record(Schema.String, Schema.Unknown)

export interface StagedDocument {
  readonly source: string
  readonly metadata: SearchMetadata
}

export function stageDocument(
  source: string,
  relativePath: string,
): StagedDocument | undefined {
  const parsed = parseMarkdown(
    source,
    "Documentation file must have YAML frontmatter",
  )
  const frontmatter = Schema.decodeUnknownSync(Frontmatter)(parsed.frontmatter)
  const frontmatterRecord = Schema.decodeUnknownSync(FrontmatterRecord)(
    parsed.frontmatter,
  )
  if (frontmatter.draft === true) return undefined

  const pathParts = relativePath
    .replace(/\\/g, "/")
    .replace(/\.(md|mdx)$/, "")
    .split("/")
  const docsVersion = pathParts[0] ?? "unknown"
  const group = pathParts.length > 2 ? (pathParts[1] ?? "") : ""
  const groupLabel = titleCase(group)
  const pageLabel = frontmatter.sidebar?.label ?? frontmatter.title
  const routePath = pathParts.join("/").replace(/(^|\/)index$/, "")
  const pageHref = `/docs/${routePath}`.replace(/\/+$/, "/")
  const breadcrumbs = [groupLabel, pageLabel].filter(
    (label) => label.length > 0,
  )
  const originalSections = sections(
    parsed.tree,
    frontmatter.title,
    frontmatter.description,
  )
  const baseMetadata: SearchMetadata = {
    schema_version: 1,
    content_source: "documentation",
    docs_version: docsVersion,
    breadcrumbs,
    page_href: pageHref,
    page_label: pageLabel,
    page_title: frontmatter.title,
    sections: originalSections,
  }
  const provisionalFrontmatter = serializeSearchFrontmatter(
    frontmatterRecord,
    baseMetadata,
    "documentation",
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
    "documentation",
  )
  if (countLines(finalFrontmatter) !== countLines(provisionalFrontmatter)) {
    throw new Error(
      `Documentation metadata changed frontmatter height for ${relativePath}`,
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

function titleCase(value: string): string {
  return value
    .split("-")
    .filter((part) => part.length > 0)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ")
}
