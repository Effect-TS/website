import * as Schema from "effect/Schema"
import { assert, test } from "vite-plus/test"
import { parse as parseYaml } from "yaml"
import { DocumentationSearchMetadata } from "../src/SearchMetadata.ts"
import { stageDocument } from "../src/Documentation.ts"

test("stages source-preserving documentation metadata", () => {
  const body = `

Page introduction with <Badge>MDX</Badge>.

## Looping and *iteration*

Use \`Effect.forEach\` for every element.

### Concurrency options

Bound how many effects run at once.

### Concurrency options

The second heading has a unique anchor.
`
  const document = stageDocument(
    `---
title: Control Flow
sidebar:
  label: Control flow
---${body}`,
    "v4/getting-started/control-flow.mdx",
  )

  assert.ok(document)
  assert.equal(
    document.source.slice(document.source.indexOf("---", 3) + 3),
    body,
  )
  assert.deepEqual(document.metadata.breadcrumbs, [
    "Getting Started",
    "Control flow",
  ])
  assert.equal(
    document.metadata.page_href,
    "/docs/v4/getting-started/control-flow",
  )
  assert.deepEqual(
    document.metadata.sections.map(({ title, anchor, parent_anchor }) => ({
      title,
      anchor,
      parent_anchor,
    })),
    [
      { title: "Control Flow", anchor: "", parent_anchor: "" },
      {
        title: "Looping and iteration",
        anchor: "looping-and-iteration",
        parent_anchor: "looping-and-iteration",
      },
      {
        title: "Concurrency options",
        anchor: "concurrency-options",
        parent_anchor: "looping-and-iteration",
      },
      {
        title: "Concurrency options",
        anchor: "concurrency-options-1",
        parent_anchor: "looping-and-iteration",
      },
    ],
  )
  assert.equal(
    document.metadata.sections[1]?.excerpt,
    "Use Effect.forEach for every element.",
  )

  const lines = document.source.split("\n")
  for (const section of document.metadata.sections.slice(1)) {
    assert.match(lines[section.line - 1] ?? "", /^#{2,6} /)
  }

  const yaml = /^---\n([\s\S]*?)\n---/.exec(document.source)?.[1]
  assert.ok(yaml)
  const stagedMetadata = Schema.decodeUnknownSync(
    Schema.Struct({ search: DocumentationSearchMetadata }),
  )(parseYaml(yaml))
  assert.equal(stagedMetadata.search.sections[2]?.title, "Concurrency options")

  const restaged = stageDocument(
    document.source,
    "v4/getting-started/control-flow.mdx",
  )
  assert.deepEqual(restaged, document)
})

test("does not index drafts", () => {
  const document = stageDocument(
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
