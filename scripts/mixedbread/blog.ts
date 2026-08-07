import type { Heading, Root, RootContent } from "mdast"
import * as Schema from "effect/Schema"
import GithubSlugger from "github-slugger"
import { toString } from "mdast-util-to-string"
import remarkFrontmatter from "remark-frontmatter"
import remarkMdx from "remark-mdx"
import remarkParse from "remark-parse"
import { unified } from "unified"
import { parse as parseYaml, stringify as stringifyYaml } from "yaml"
import { SearchSection } from "./documentation.ts"

const Frontmatter = Schema.Struct({
  title: Schema.String,
  excerpt: Schema.String,
  date: Schema.String,
  authors: Schema.Array(Schema.String),
  tags: Schema.Array(Schema.String),
  draft: Schema.optional(Schema.Boolean),
})

const FrontmatterRecord = Schema.Record(Schema.String, Schema.Unknown)

export const SearchMetadata = Schema.Struct({
  schema_version: Schema.Literal(1),
  content_source: Schema.Literal("blog"),
  page_href: Schema.String,
  page_title: Schema.String,
  description: Schema.String,
  published_at: Schema.String,
  authors: Schema.Array(Schema.String),
  tags: Schema.Array(Schema.String),
  sections: Schema.Array(SearchSection),
})
export type SearchMetadata = typeof SearchMetadata.Type

export interface StagedBlogPost {
  readonly source: string
  readonly metadata: SearchMetadata
}

const processor = unified()
  .use(remarkParse)
  .use(remarkMdx)
  .use(remarkFrontmatter, ["yaml"])
const MAX_EXCERPT_LENGTH = 240
const MAX_SEARCH_METADATA_LENGTH = 64_000

export function stageBlogPost(
  source: string,
  relativePath: string,
): StagedBlogPost | undefined {
  const initial = parseDocument(source)
  if (initial.frontmatter.draft === true) return undefined

  const pageHref = `/blog/${blogPostId(relativePath)}`
  const originalSections = sections(
    initial.tree,
    initial.frontmatter.title,
    initial.frontmatter.excerpt,
  )
  const baseMetadata: SearchMetadata = {
    schema_version: 1,
    content_source: "blog",
    page_href: pageHref,
    page_title: initial.frontmatter.title,
    description: initial.frontmatter.excerpt,
    published_at: initial.frontmatter.date,
    authors: initial.frontmatter.authors,
    tags: initial.frontmatter.tags,
    sections: originalSections,
  }
  const provisionalFrontmatter = serializeFrontmatter(
    initial.frontmatterRecord,
    baseMetadata,
  )
  const lineDelta =
    countLines(provisionalFrontmatter) - frontmatterLines(initial)
  const metadata: SearchMetadata = {
    ...baseMetadata,
    sections: originalSections.map((section) => ({
      ...section,
      line: section.line === 1 ? 1 : section.line + lineDelta,
    })),
  }
  const finalFrontmatter = serializeFrontmatter(
    initial.frontmatterRecord,
    metadata,
  )
  if (countLines(finalFrontmatter) !== countLines(provisionalFrontmatter)) {
    throw new Error(
      `Blog metadata changed frontmatter height for ${relativePath}`,
    )
  }

  return {
    source: spliceFrontmatter(source, initial, finalFrontmatter),
    metadata,
  }
}

export function blogPostId(relativePath: string): string {
  return relativePath
    .replace(/\\/g, "/")
    .replace(/\.(md|mdx)$/, "")
    .replace(/(^|\/)index$/, "")
    .split("/")
    .filter((part) => part.length > 0)
    .map((part) => part.toLowerCase().replace(/\./g, ""))
    .join("/")
}

interface ParsedDocument {
  readonly tree: Root
  readonly yaml: RootContent & { readonly type: "yaml"; readonly value: string }
  readonly frontmatter: typeof Frontmatter.Type
  readonly frontmatterRecord: typeof FrontmatterRecord.Type
}

function parseDocument(source: string): ParsedDocument {
  const tree = processor.parse(source)
  const yaml = tree.children.find(isYaml)
  if (yaml === undefined)
    throw new Error("Blog post must have YAML frontmatter")

  const value: unknown = parseYaml(yaml.value)
  return {
    tree,
    yaml,
    frontmatter: Schema.decodeUnknownSync(Frontmatter)(value),
    frontmatterRecord: Schema.decodeUnknownSync(FrontmatterRecord)(value),
  }
}

function isYaml(
  node: RootContent,
): node is RootContent & { readonly type: "yaml"; readonly value: string } {
  return node.type === "yaml"
}

function serializeFrontmatter(
  frontmatterRecord: typeof FrontmatterRecord.Type,
  metadata: SearchMetadata,
): string {
  const yaml = stringifyYaml(
    {
      ...frontmatterRecord,
      search: {
        ...metadata,
        sections: metadata.sections.map((section) => JSON.stringify(section)),
      },
    },
    { lineWidth: 0 },
  ).trimEnd()
  if (new TextEncoder().encode(yaml).length > MAX_SEARCH_METADATA_LENGTH) {
    throw new Error(
      `Generated blog frontmatter exceeds ${MAX_SEARCH_METADATA_LENGTH} bytes`,
    )
  }
  return `---\n${yaml}\n---`
}

function frontmatterLines(parsed: ParsedDocument): number {
  const start = parsed.yaml.position?.start.line
  const end = parsed.yaml.position?.end.line
  if (start === undefined || end === undefined) {
    throw new Error("Blog frontmatter is missing source lines")
  }
  return end - start + 1
}

function spliceFrontmatter(
  source: string,
  parsed: ParsedDocument,
  frontmatter: string,
): string {
  const start = parsed.yaml.position?.start.offset
  const end = parsed.yaml.position?.end.offset
  if (start === undefined || end === undefined) {
    throw new Error("Blog frontmatter is missing source offsets")
  }
  return `${source.slice(0, start)}${frontmatter}${source.slice(end)}`
}

function countLines(value: string): number {
  return value.split("\n").length
}

function sections(
  tree: Root,
  pageTitle: string,
  pageDescription: string,
): ReadonlyArray<typeof SearchSection.Type> {
  const slugger = new GithubSlugger()
  const result: Array<typeof SearchSection.Type> = [
    {
      line: 1,
      level: 1,
      title: pageTitle,
      anchor: "",
      parent_anchor: "",
      excerpt: pageDescription,
    },
  ]
  let parentAnchor = ""

  tree.children.forEach((node, index) => {
    if (node.type !== "heading") return
    const title = toString(node).trim()
    const anchor = slugger.slug(title)
    if (node.depth === 2) parentAnchor = anchor
    result.push({
      line: requiredHeadingLine(node),
      level: node.depth,
      title,
      anchor,
      parent_anchor: node.depth === 2 ? anchor : parentAnchor,
      excerpt: excerpt(tree.children, index + 1),
    })
  })

  return result
}

function requiredHeadingLine(heading: Heading): number {
  const line = heading.position?.start.line
  if (line === undefined)
    throw new Error(`Heading is missing a source line: ${toString(heading)}`)
  return line
}

function excerpt(nodes: ReadonlyArray<RootContent>, start: number): string {
  const parts: Array<string> = []
  for (let index = start; index < nodes.length; index++) {
    const node = nodes[index]
    if (node === undefined || node.type === "heading") break
    if (
      node.type === "code" ||
      node.type === "html" ||
      node.type === "mdxjsEsm" ||
      node.type === "mdxFlowExpression" ||
      node.type === "mdxJsxFlowElement" ||
      node.type === "yaml"
    ) {
      continue
    }
    const text = toString(node).replace(/\s+/g, " ").trim()
    if (text.length > 0) parts.push(text)
  }
  const text = parts.join(" ")
  return text.length <= MAX_EXCERPT_LENGTH
    ? text
    : `${text.slice(0, MAX_EXCERPT_LENGTH - 3).trimEnd()}...`
}
