import type {
  Element,
  ElementContent,
  Properties,
  Root,
  RootContent,
} from "hast"
import { describe, expect, it } from "vite-plus/test"

import { rehypeHeadingLinks } from "../../../src/features/docs/rehype-heading-links.js"

describe("rehypeHeadingLinks", () => {
  it("adds an accessible permalink without changing the heading ID", () => {
    const heading = element("h2", { id: "getting-started" }, [
      text("Getting started"),
    ])
    const tree = root([heading])

    rehypeHeadingLinks()(tree)

    const link = requiredElement(heading.children[0])
    expect(heading.properties.id).toBe("getting-started")
    expect(link.properties).toMatchObject({
      ariaLabel: "Link to Getting started",
      className: ["heading-permalink"],
      href: "#getting-started",
    })
    expect(heading.children[1]).toEqual(text("Getting started"))
  })

  it("uses formatted heading text in the accessible label", () => {
    const heading = element("h3", { id: "using-effect-runpromise" }, [
      text("Using "),
      element("code", {}, [text("Effect.runPromise")]),
    ])

    rehypeHeadingLinks()(root([heading]))

    const link = requiredElement(heading.children[0])
    expect(link.properties.ariaLabel).toBe("Link to Using Effect.runPromise")
  })

  it("preserves distinct duplicate-heading slugs", () => {
    const first = element("h2", { id: "example" }, [text("Example")])
    const second = element("h2", { id: "example-1" }, [text("Example")])

    rehypeHeadingLinks()(root([first, second]))

    expect(requiredElement(first.children[0]).properties.href).toBe("#example")
    expect(requiredElement(second.children[0]).properties.href).toBe(
      "#example-1",
    )
  })

  it("ignores elements that are not identified headings", () => {
    const heading = element("h2", {}, [text("No ID")])
    const paragraph = element("p", { id: "paragraph" }, [text("Paragraph")])

    rehypeHeadingLinks()(root([heading, paragraph]))

    expect(heading.children).toEqual([text("No ID")])
    expect(paragraph.children).toEqual([text("Paragraph")])
  })
})

function root(children: Array<RootContent>): Root {
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

function requiredElement(child: ElementContent | undefined): Element {
  if (child?.type !== "element") {
    throw new Error("Expected heading permalink element")
  }
  return child
}
