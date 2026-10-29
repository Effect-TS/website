import { assert, test } from "vite-plus/test"
import { blogPage, blogPostId } from "../src/Blog.ts"

const source = (extra = "") => `---
title: From React to Effect
excerpt: A practical migration story.
date: 2025-07-10
${extra}authors:
  - maxwell_brown
tags:
  - effect
---

Post introduction.

## Why Effect?

Because typed errors are useful.

### Error handling

Handle expected failures explicitly.
`

test("chunks a post with its page metadata", () => {
  const page = blogPage(source(), "from-react-to-effect.mdx")
  assert.ok(page)
  assert.equal(page.href, "/blog/from-react-to-effect")
  assert.equal(page.directory, "blog")
  assert.equal(page.name, "from-react-to-effect")
  assert.equal(page.version, undefined)
  const [overview, , why] = page.chunks
  assert.deepInclude(overview?.generated_metadata, {
    page_title: "From React to Effect",
    description: "A practical migration story.",
    published_at: "2025-07-10",
    section_anchor: "",
  })
  assert.deepEqual(overview?.generated_metadata.authors, ["maxwell_brown"])
  assert.deepEqual(overview?.generated_metadata.tags, ["effect"])
  assert.equal(why?.generated_metadata.section_anchor, "why-effect")
  assert.isTrue(
    why?.text.startsWith(
      "# From React to Effect\nEffect blog · 2025-07-10 · effect\n\n",
    ),
  )
  assert.include(why?.text, "### Error handling")
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

test("places a nested post under its path", () => {
  const page = blogPage(source(), "this-week-in-effect/126/index.mdx")
  assert.equal(page?.directory, "blog/this-week-in-effect")
  assert.equal(page?.name, "126")
})

test("reports the docs version of a versioned post", () => {
  assert.equal(blogPage(source("version: v3\n"), "release.mdx")?.version, "v3")
})

test("does not index drafts", () => {
  assert.equal(blogPage(source("draft: true\n"), "draft.mdx"), undefined)
})
