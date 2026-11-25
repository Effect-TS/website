import type { Element, Root } from "hast"

export function rehypeTableScroll() {
  return (tree: Root) => {
    wrapTables(tree)
  }
}

// Wrap each table in a scroll container so a wide table scrolls on its own
// instead of widening the page. The wrapper itself is never re-visited.
function wrapTables(parent: Root | Element): void {
  parent.children = parent.children.map((child) => {
    if (child.type !== "element") return child

    if (child.tagName === "table") {
      return {
        type: "element",
        tagName: "div",
        properties: { className: ["table-scroll"] },
        children: [child],
      } satisfies Element
    }

    wrapTables(child)
    return child
  })
}
