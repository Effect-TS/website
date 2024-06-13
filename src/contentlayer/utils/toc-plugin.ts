import type * as unified from "unified"
import GithubSlugger from "github-slugger"
import { toString } from "hast-util-to-string"

export const tocPlugin =
  (headings: DocHeading[]): unified.Plugin =>
  () => {
    const slugger = new GithubSlugger()
    return (node: any) => {
      for (const element of node.children.filter(
        (_: any) => _.type === "heading"
      )) {
        const title = toString(element)
        headings.push({
          level: element.depth,
          title,
          slug: slugger.slug(title)
        })
      }
    }
  }
