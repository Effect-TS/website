import rehypeStringify from "rehype-stringify"
import remarkGfm from "remark-gfm"
import remarkParse from "remark-parse"
import remarkRehype from "remark-rehype"
import { unified } from "unified"

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

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkLiteralHtml)
  .use(remarkRehype)
  .use(rehypeStringify)

// Commit-link lists make "Updated dependencies" unreadable on the page.
const DEPENDENCY_COMMITS = /^(\s*- Updated dependencies) \[.*\]:$/gm

// Lockstep releases repeat the same notes in many packages, and the feed
// renders the releases its page already did.
const rendered = new Map<string, string>()

/** Render one release body to HTML. Raw HTML in the source stays text. */
export function renderChangelogHtml(markdown: string): string {
  const source = markdown.replace(DEPENDENCY_COMMITS, "$1:")
  let html = rendered.get(source)
  if (html === undefined) {
    html = String(processor.processSync(source))
    rendered.set(source, html)
  }
  return html
}
