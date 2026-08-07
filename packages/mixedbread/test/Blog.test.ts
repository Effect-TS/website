import * as Schema from "effect/Schema"
import { assert, test } from "vite-plus/test"
import { parse as parseYaml } from "yaml"
import { BlogSearchMetadata } from "../src/SearchMetadata.ts"
import { blogPostId, stageBlogPost } from "../src/Blog.ts"

test("stages source-preserving blog metadata", () => {
  const body = `

Post introduction.

## Why Effect?

Because typed errors are useful.

### Error handling

Handle expected failures explicitly.
`
  const post = stageBlogPost(
    `---
title: From React to Effect
excerpt: A practical migration story.
date: 2025-07-10
authors:
  - maxwell_brown
tags:
  - effect
---${body}`,
    "from-react-to-effect.mdx",
  )

  assert.ok(post)
  assert.equal(post.source.slice(post.source.indexOf("---", 3) + 3), body)
  assert.equal(post.metadata.page_href, "/blog/from-react-to-effect")
  assert.equal(post.metadata.published_at, "2025-07-10")
  assert.deepEqual(post.metadata.authors, ["maxwell_brown"])
  assert.equal(post.metadata.sections[1]?.anchor, "why-effect")

  const yaml = /^---\n([\s\S]*?)\n---/.exec(post.source)?.[1]
  assert.ok(yaml)
  const stagedMetadata = Schema.decodeUnknownSync(
    Schema.Struct({ search: BlogSearchMetadata }),
  )(parseYaml(yaml))
  assert.equal(stagedMetadata.search.sections[2]?.title, "Error handling")

  const restaged = stageBlogPost(post.source, "from-react-to-effect.mdx")
  assert.deepEqual(restaged, post)
})

test("derives blog IDs using Astro collection conventions", () => {
  assert.equal(
    blogPostId("this-week-in-effect/126/index.mdx"),
    "this-week-in-effect/126",
  )
  assert.equal(
    blogPostId("releases/effect/4.0-beta.mdx"),
    "releases/effect/40-beta",
  )
  assert.equal(
    blogPostId("effect-v4Beta-july-recap.mdx"),
    "effect-v4beta-july-recap",
  )
})
