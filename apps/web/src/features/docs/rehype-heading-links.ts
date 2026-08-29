import type { Element, ElementContent, Root } from "hast"

const headingPattern = /^h[1-6]$/

export function rehypeHeadingLinks() {
  return (tree: Root) => {
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
