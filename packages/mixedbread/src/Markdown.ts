import type { Heading, Root, RootContent } from "mdast"
import GithubSlugger from "github-slugger"
import { toString } from "mdast-util-to-string"
import remarkFrontmatter from "remark-frontmatter"
import remarkMdx from "remark-mdx"
import remarkParse from "remark-parse"
import { unified } from "unified"
import { parse as parseYaml, stringify as stringifyYaml } from "yaml"
import type { SearchSection } from "@website/domain/SearchMetadata"

const processor = unified()
  .use(remarkParse)
  .use(remarkMdx)
  .use(remarkFrontmatter, ["yaml"])
const MAX_EXCERPT_LENGTH = 240
const MAX_SEARCH_METADATA_LENGTH = 64_000

export interface ParsedMarkdown {
  readonly tree: Root
  readonly yaml: RootContent & { readonly type: "yaml"; readonly value: string }
  readonly frontmatter: unknown
}

export function parseMarkdown(
  source: string,
  missingFrontmatterMessage: string,
): ParsedMarkdown {
  const tree = processor.parse(source)
  const yaml = tree.children.find(isYaml)
  if (yaml === undefined) throw new Error(missingFrontmatterMessage)
  return { tree, yaml, frontmatter: parseYaml(yaml.value) }
}

export function serializeSearchFrontmatter(
  frontmatter: Readonly<Record<string, unknown>>,
  metadata: { readonly sections: ReadonlyArray<SearchSection> },
  contentName: string,
): string {
  const yaml = stringifyYaml(
    {
      ...frontmatter,
      search: {
        ...metadata,
        sections: metadata.sections.map((section) => JSON.stringify(section)),
      },
    },
    { lineWidth: 0 },
  ).trimEnd()
  if (new TextEncoder().encode(yaml).length > MAX_SEARCH_METADATA_LENGTH) {
    throw new Error(
      `Generated ${contentName} frontmatter exceeds ${MAX_SEARCH_METADATA_LENGTH} bytes`,
    )
  }
  return `---\n${yaml}\n---`
}

export function frontmatterLines(
  parsed: ParsedMarkdown,
  missingPositionMessage: string,
): number {
  const start = parsed.yaml.position?.start.line
  const end = parsed.yaml.position?.end.line
  if (start === undefined || end === undefined) {
    throw new Error(missingPositionMessage)
  }
  return end - start + 1
}

export function spliceFrontmatter(
  source: string,
  parsed: ParsedMarkdown,
  frontmatter: string,
  missingPositionMessage: string,
): string {
  const start = parsed.yaml.position?.start.offset
  const end = parsed.yaml.position?.end.offset
  if (start === undefined || end === undefined) {
    throw new Error(missingPositionMessage)
  }
  return `${source.slice(0, start)}${frontmatter}${source.slice(end)}`
}

export function countLines(value: string): number {
  return value.split("\n").length
}

export function sections(
  tree: Root,
  pageTitle: string,
  pageDescription: string | undefined,
): ReadonlyArray<SearchSection> {
  const slugger = new GithubSlugger()
  const result: Array<SearchSection> = [
    {
      line: 1,
      level: 1,
      title: pageTitle,
      anchor: "",
      parent_anchor: "",
      excerpt: pageDescription ?? excerpt(tree.children, 0),
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

function isYaml(
  node: RootContent,
): node is RootContent & { readonly type: "yaml"; readonly value: string } {
  return node.type === "yaml"
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
