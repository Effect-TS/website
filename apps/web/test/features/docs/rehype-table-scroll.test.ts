import type { Element, ElementContent, Properties, Root } from "hast"
import { describe, expect, it } from "vite-plus/test"

import { rehypeTableScroll } from "../../../src/features/docs/rehype-table-scroll.js"

describe("rehypeTableScroll", () => {
  it("wraps a table in a scroll container", () => {
    const table = element("table", {}, [text("cells")])
    const tree = root([element("p", {}, [text("Before")]), table])

    rehypeTableScroll()(tree)

    const wrapper = tree.children[1]
    expect(wrapper).toEqual(
      element("div", { className: ["table-scroll"] }, [table]),
    )
    expect(tree.children[0]).toEqual(element("p", {}, [text("Before")]))
  })

  it("wraps tables nested in other elements, once each", () => {
    const first = element("table", {}, [])
    const second = element("table", {}, [])
    const tree = root([
      element("section", {}, [first]),
      element("blockquote", {}, [second]),
    ])

    rehypeTableScroll()(tree)

    const wrapped = tree.children.map((child) => {
      const parent = child as Element
      const wrapper = parent.children[0] as Element
      return [wrapper.tagName, wrapper.properties.className, wrapper.children]
    })
    expect(wrapped).toEqual([
      ["div", ["table-scroll"], [first]],
      ["div", ["table-scroll"], [second]],
    ])
  })

  it("leaves trees without tables untouched", () => {
    const tree = root([element("p", {}, [text("No tables")])])

    rehypeTableScroll()(tree)

    expect(tree).toEqual(root([element("p", {}, [text("No tables")])]))
  })
})

function root(children: Root["children"]): Root {
  return { type: "root", children }
}

function element(
  tagName: string,
  properties: Properties,
  children: Array<ElementContent>,
): Element {
  return { type: "element", tagName, properties, children }
}

function text(value: string): ElementContent {
  return { type: "text", value }
}
