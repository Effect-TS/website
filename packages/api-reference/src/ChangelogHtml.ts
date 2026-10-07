import rehypeStringify from "rehype-stringify"
import remarkGfm from "remark-gfm"
import remarkParse from "remark-parse"
import remarkRehype from "remark-rehype"
import { unified } from "unified"

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype)
  .use(rehypeStringify)

// Commit-link lists make "Updated dependencies" unreadable on the page.
const DEPENDENCY_COMMITS = /^(\s*- Updated dependencies) \[.*\]:$/gm

/** Render one release body to HTML. Raw HTML in the source is dropped. */
export function renderChangelogHtml(markdown: string): string {
  return String(
    processor.processSync(markdown.replace(DEPENDENCY_COMMITS, "$1:")),
  )
}
