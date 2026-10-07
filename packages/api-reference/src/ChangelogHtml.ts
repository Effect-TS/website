import type { Element, ElementContent, Root } from "hast"
import GithubSlugger from "github-slugger"
import type { Root as MdastRoot } from "mdast"
import rehypeStringify from "rehype-stringify"
import remarkGfm from "remark-gfm"
import remarkParse from "remark-parse"
import remarkRehype from "remark-rehype"
import { unified, type Plugin } from "unified"

interface MarkdownNode {
  type: string
  value?: string
  children?: Array<MarkdownNode>
}

const LINE_BREAK = /^<br\s*\/?>$/i

// Changelogs hold `Effect<A, E>` outside code and `<br/>` in tables. Neither
// should become live HTML: keep line breaks, show everything else as text.
function remarkLiteralHtml() {
  const rewrite = (node: MarkdownNode): void => {
    if (node.children === undefined) return
    node.children = node.children.map((child) => {
      if (child.type !== "html") {
        rewrite(child)
        return child
      }
      const value = child.value ?? ""
      return LINE_BREAK.test(value.trim())
        ? { type: "break" }
        : { type: "text", value }
    })
  }
  return rewrite
}

const headingPattern = /^h[1-6]$/

// Heading ids, mirroring docs pages (`rehypeHeadingIds` in astro.config.ts).
// `prefix` scopes slugs to one release so repeated headings like
// "Patch Changes" stay unique across the page.
const rehypeHeadingIds: Plugin<
  [{ readonly prefix: string | undefined }],
  Root
> = (options) => {
  const slugger = new GithubSlugger()
  return (tree) => {
    addHeadingIds(tree, slugger, options.prefix)
  }
}

function addHeadingIds(
  parent: Root | Element,
  slugger: GithubSlugger,
  prefix: string | undefined,
): void {
  for (const child of parent.children) {
    if (child.type !== "element") continue
    if (
      headingPattern.test(child.tagName) &&
      (child.properties.id === undefined ||
        typeof child.properties.id !== "string")
    ) {
      const slug = slugger.slug(textContent(child.children))
      child.properties.id =
        prefix === undefined || prefix === "" ? slug : `${prefix}-${slug}`
    }
    addHeadingIds(child, slugger, prefix)
  }
}

// Heading permalinks, reused from
// `apps/web/src/features/docs/rehype-heading-links.ts`: an inline link with
// the same `heading-permalink` class docs pages style via `.prose-effect`,
// hidden until the heading is hovered or the link focused.
const rehypeHeadingLinks: Plugin<[], Root> = () => {
  return (tree) => {
    addHeadingLinks(tree)
  }
}

function addHeadingLinks(parent: Root | Element): void {
  for (const child of parent.children) {
    if (child.type !== "element") continue

    const id = child.properties.id
    if (
      headingPattern.test(child.tagName) &&
      typeof id === "string" &&
      id.length > 0
    ) {
      const title = textContent(child.children)
      child.children.unshift(headingLink(id, title))
      continue
    }

    addHeadingLinks(child)
  }
}

function headingLink(id: string, title: string): Element {
  return {
    type: "element",
    tagName: "a",
    properties: {
      ariaLabel: title.length > 0 ? `Link to ${title}` : "Link to this section",
      className: ["heading-permalink"],
      href: `#${id}`,
    },
    children: [
      {
        type: "element",
        tagName: "svg",
        properties: {
          ariaHidden: "true",
          focusable: "false",
          viewBox: "0 0 24 24",
        },
        children: [
          {
            type: "element",
            tagName: "path",
            properties: {
              d: "m12.11 15.39-3.88 3.88a2.52 2.52 0 0 1-3.5 0 2.47 2.47 0 0 1 0-3.5l3.88-3.88a1 1 0 0 0-1.42-1.42l-3.88 3.89a4.48 4.48 0 0 0 6.33 6.33l3.89-3.88a1 1 0 1 0-1.42-1.42Zm8.58-12.08a4.49 4.49 0 0 0-6.33 0l-3.89 3.88a1 1 0 0 0 1.42 1.42l3.88-3.88a2.52 2.52 0 0 1 3.5 0 2.47 2.47 0 0 1 0 3.5l-3.88 3.88a1 1 0 1 0 1.42 1.42l3.88-3.89a4.49 4.49 0 0 0 0-6.33ZM8.83 15.17a1 1 0 0 0 1.1.22 1 1 0 0 0 .32-.22l4.92-4.92a1 1 0 0 0-1.42-1.42l-4.92 4.92a1 1 0 0 0 0 1.42Z",
              fill: "currentColor",
            },
            children: [],
          },
        ],
      },
    ],
  }
}

function textContent(children: ReadonlyArray<ElementContent>): string {
  return children
    .map((child) => {
      if (child.type === "text") return child.value
      if (child.type === "element") return textContent(child.children)
      return ""
    })
    .join("")
}

// Commit-link lists make "Updated dependencies" unreadable on the page.
const DEPENDENCY_COMMITS = /^(\s*- Updated dependencies) \[.*\]:$/gm

const mdastParser = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkLiteralHtml)

function hastPipeline(prefix: { readonly prefix: string | undefined }) {
  return unified()
    .use(remarkRehype)
    .use(rehypeHeadingIds, prefix)
    .use(rehypeHeadingLinks)
    .use(rehypeStringify)
}

// Lockstep releases repeat the same notes in many packages, and the feed
// renders the releases its page already did.
const rendered = new Map<string, string>()

export interface RenderChangelogHtmlOptions {
  readonly idPrefix?: string
}

/** Render one release body to HTML. Raw HTML in the source stays text. */
export function renderChangelogHtml(
  markdown: string,
  options: RenderChangelogHtmlOptions = {},
): string {
  const source = markdown.replace(DEPENDENCY_COMMITS, "$1:")
  const key =
    options.idPrefix === undefined ? source : `${options.idPrefix}\n${source}`
  let html = rendered.get(key)
  if (html === undefined) {
    const prefix =
      options.idPrefix === undefined
        ? undefined
        : slugifyPrefix(options.idPrefix)
    const mdast = mdastParser.runSync(mdastParser.parse(source)) as MdastRoot
    const pipeline = hastPipeline({ prefix })
    html = String(pipeline.stringify(pipeline.runSync(mdast)))
    rendered.set(key, html)
  }
  return html
}

// Release versions (`4.0.0-rc.9`, `0.0.0-next-20260101`) slug the same way
// headings do, so prefixed ids stay URL-safe.
function slugifyPrefix(prefix: string): string {
  return prefix
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}
