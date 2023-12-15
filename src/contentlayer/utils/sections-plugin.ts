import type * as unified from "unified"
import { toMarkdown } from "mdast-util-to-markdown"
import { mdxToMarkdown } from "mdast-util-mdx"

export const sectionsPlugin =
  (sections: DocsSection[]): unified.Plugin =>
  () => {
    return (node: any) => {
      let currentSection: any = { heading: undefined, content: "" }
      let first: boolean = true

      for (const element of node.children) {
        if (element.type === "heading") {
          if (!first) {
            sections.push(currentSection)
            currentSection = { heading: undefined, content: "" }
          }
          first = false
          const title = toMarkdown(
            { type: "paragraph", children: element.children },
            { extensions: [mdxToMarkdown()] }
          )
            .trim()
            .replace(/<.*$/g, "")
            .replace(/\\/g, "")
            .trim()
          currentSection.heading = { level: element.depth, title }
        } else if (element.type === "paragraph") {
          const content =
            element.children.map((child: any) => child.value).join("") + " "
          currentSection.content += content
        }
      }
    }
  }
