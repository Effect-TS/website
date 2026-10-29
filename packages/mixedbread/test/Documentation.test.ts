import { assert, test } from "vite-plus/test"
import { MAX_MARKDOWN_CHUNK_LENGTH } from "../src/Config.ts"
import { documentationPage } from "../src/Documentation.ts"

const page = (body: string, frontmatter = "") =>
  documentationPage(
    `---
title: Control Flow
description: Branch and loop with effects.
sidebar:
  label: Control flow
${frontmatter}---${body}`,
    "v4/getting-started/control-flow.mdx",
  )

const body = `

import { Badge } from "@components/Badge"

Page introduction with <Badge>MDX</Badge>.

## Looping and *iteration*

Use \`Effect.forEach\` for every element.

### Concurrency options

Bound how many effects run at once.

### Concurrency options

The second heading has a unique anchor.

## Branching

Use \`Effect.if\`.
`

test("describes the page and where each chunk belongs", () => {
  const result = page(body)
  assert.ok(result)
  assert.equal(result.href, "/docs/v4/getting-started/control-flow")
  assert.equal(result.version, "v4")
  assert.equal(result.directory, "documentation/v4/getting-started")
  assert.equal(result.name, "control-flow")
  const [overview, intro, looping, branching] = result.chunks
  assert.deepInclude(overview?.generated_metadata, {
    page_href: "/docs/v4/getting-started/control-flow",
    page_title: "Control Flow",
    section_anchor: "",
    parent_anchor: "",
  })
  assert.deepEqual(overview?.generated_metadata.breadcrumbs, [
    "Getting Started",
    "Control flow",
  ])
  assert.deepInclude(looping?.generated_metadata, {
    section_title: "Looping and iteration",
    section_anchor: "looping-and-iteration",
    parent_anchor: "looping-and-iteration",
  })
  assert.deepInclude(branching?.generated_metadata, {
    section_anchor: "branching",
  })
  assert.equal(intro?.generated_metadata.section_anchor, "")
})

test("starts every chunk with the page title and context", () => {
  const result = page(body)
  assert.ok(result)
  for (const chunk of result.chunks) {
    assert.isTrue(
      chunk.text.startsWith(
        "# Control Flow\nGetting Started › Control flow · Effect v4 docs\n\n",
      ),
      chunk.text.slice(0, 80),
    )
  }
})

test("keeps frontmatter, MDX imports and heading ids out of the text", () => {
  const result = page(body, "pagefind: false\n")
  assert.ok(result)
  const text = result.chunks.map((chunk) => chunk.text).join("\n")
  assert.notInclude(text, "pagefind")
  assert.notInclude(text, "sidebar:")
  assert.notInclude(text, "import { Badge }")
  assert.include(text, "Use `Effect.forEach` for every element.")
})

test("overview lists the description and sections", () => {
  const [overview] = page(body)?.chunks ?? []
  assert.include(overview?.text, "Branch and loop with effects.")
  assert.include(overview?.text, "- Looping and iteration")
  assert.include(overview?.text, "- Concurrency options")
  assert.include(overview?.text, "- Branching")
})

test("shares a chunk between an h2 and its h3s while they fit", () => {
  const chunks = page(body)?.chunks ?? []
  const looping = chunks.find(
    ({ generated_metadata }) =>
      generated_metadata.section_anchor === "looping-and-iteration",
  )
  assert.include(looping?.text, "Bound how many effects run at once.")
  assert.include(looping?.text, "The second heading has a unique anchor.")
})

test("packs long sections by h3 and splits what still does not fit", () => {
  const long = (title: string, words: number) =>
    `### ${title}\n\n${"word ".repeat(words)}\n`
  const result = page(
    `\n\n## Long\n\n${long("First", 250)}\n${long("Second", 250)}\n${long("Third", 800)}`,
  )
  assert.ok(result)
  const chunks = result.chunks.filter(
    ({ generated_metadata }) => generated_metadata.parent_anchor === "long",
  )
  assert.isAbove(chunks.length, 2)
  assert.isTrue(
    chunks.every(({ text }) => text.length <= MAX_MARKDOWN_CHUNK_LENGTH),
  )
  assert.deepEqual(
    [
      ...new Set(
        chunks.map(
          ({ generated_metadata }) => generated_metadata.parent_anchor,
        ),
      ),
    ],
    ["long"],
  )
  assert.isTrue(
    chunks.some(
      ({ generated_metadata }) => generated_metadata.section_anchor === "third",
    ),
  )
})

test("does not index drafts", () => {
  assert.equal(
    documentationPage(
      `---
title: Draft
draft: true
---

Unpublished content.
`,
      "v4/draft.mdx",
    ),
    undefined,
  )
})
