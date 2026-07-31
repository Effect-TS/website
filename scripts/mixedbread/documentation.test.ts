import assert from "node:assert/strict"
import test from "node:test"
import { makeDocument } from "./documentation.ts"

test("builds section-centric documentation chunks", () => {
  const document = makeDocument(
    `---
title: Control Flow
sidebar:
  label: Control flow
---

Page introduction.

## Looping and iteration

Use \`Effect.forEach\` for every element.

### Concurrency options

Bound how many effects run at once.

### Concurrency options

The second heading has a unique anchor.
`,
    "v4/getting-started/control-flow.mdx",
  )

  assert.ok(document)
  assert.deepEqual(document.metadata, {
    content_source: "documentation",
    docs_version: "v4",
    group_label: "Getting Started",
    page_href: "/docs/v4/getting-started/control-flow",
    page_label: "Control flow",
    page_title: "Control Flow",
  })

  const sections = document.chunks.map((chunk) => chunk.generated_metadata)
  assert.deepEqual(
    sections.map((section) => section.section_anchor),
    ["", "looping-and-iteration", "concurrency-options", "concurrency-options-1"],
  )
  assert.equal(sections[2]?.parent_section_title, "Looping and iteration")
  assert.equal(sections[2]?.parent_section_anchor, "looping-and-iteration")
  assert.equal(sections[2]?.parent_section_excerpt, "Use Effect.forEach for every element.")
})

test("does not index drafts", () => {
  const document = makeDocument(
    `---
title: Draft
draft: true
---

Unpublished content.
`,
    "v4/draft.mdx",
  )

  assert.equal(document, undefined)
})
