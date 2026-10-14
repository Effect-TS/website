import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"
import { assert, test } from "vite-plus/test"
import {
  docsBodyToMarkdown,
  docsPageToMarkdown,
  markdownSlugForDocId,
  splitFenceSegments,
} from "../../../src/features/docs/markdown.ts"

const stripFrontmatter = (source: string) =>
  source.replace(/^---\n[\s\S]*?\n---\n/, "")

test("docsPageToMarkdown renders title and transformed body", () => {
  const markdown = docsPageToMarkdown({
    title: "Introduction",
    body: "Welcome to the Effect documentation!",
  })
  assert.equal(
    markdown,
    "# Introduction\n\nWelcome to the Effect documentation!\n",
  )
})

test("markdownSlugForDocId mirrors page slugs", () => {
  assert.equal(
    markdownSlugForDocId("getting-started/introduction"),
    "getting-started/introduction.md",
  )
  assert.equal(markdownSlugForDocId("index"), "index.md")
})

test("removes top-level imports but keeps imports inside code fences", () => {
  const body = [
    'import { Aside } from "@astrojs/starlight/components"',
    "",
    "Some text.",
    "",
    '```ts twoslash import.meta.vitest name="x"',
    'import { Effect } from "effect"',
    "const program = Effect.succeed(1)",
    "```",
  ].join("\n")

  assert.equal(
    docsBodyToMarkdown(body),
    [
      "Some text.",
      "",
      "```ts",
      'import { Effect } from "effect"',
      "const program = Effect.succeed(1)",
      "```",
      "",
    ].join("\n"),
  )
})

test("reduces code fence info strings to the language", () => {
  const body = [
    '```ts twoslash collapse={3-33} import.meta.vitest name="x"',
    "const a = 1",
    "```",
    "",
    "```sh showLineNumbers=false",
    "pnpm install",
    "```",
    "",
    "```text showLi",
    "diagram",
    "```",
    "",
    '```mermaid title="Request flow"',
    "flowchart TD",
    "  A --> B",
    "```",
    "",
    "```",
    "bare fence",
    "```",
  ].join("\n")

  assert.deepEqual(
    [...docsBodyToMarkdown(body).matchAll(/^(`{3}.*)$/gm)].map((m) => m[1]),
    [
      "```ts",
      "```",
      "```sh",
      "```",
      "```text",
      "```",
      "```mermaid",
      "```",
      "```",
      "```",
    ],
  )
})

test("converts Asides into blockquotes with their label", () => {
  const body = [
    "Before.",
    "",
    '<Aside type="tip" title="Use Precise Types">',
    "  In a real world scenario we may want to use more precise types.",
    "</Aside>",
    "",
    '<Aside type="note">',
    "  Defaults to Note.",
    "</Aside>",
    "",
    "After.",
  ].join("\n")

  assert.equal(
    docsBodyToMarkdown(body),
    [
      "Before.",
      "",
      "> **Use Precise Types**",
      ">",
      "> In a real world scenario we may want to use more precise types.",
      "",
      "> **Note**",
      ">",
      "> Defaults to Note.",
      "",
      "After.",
      "",
    ].join("\n"),
  )
})

test("keeps code fences and multi-paragraph content inside Aside blockquotes", () => {
  const body = [
    '<Aside type="caution" title="Careful">',
    "  First paragraph.",
    "",
    "```text showLineNumbers=false",
    "diagram",
    "```",
    "</Aside>",
  ].join("\n")

  assert.equal(
    docsBodyToMarkdown(body),
    [
      "> **Careful**",
      ">",
      "> First paragraph.",
      ">",
      "> ```text",
      "> diagram",
      "> ```",
      "",
    ].join("\n"),
  )
})

test("indents Aside blockquotes when nested inside list items", () => {
  const body = [
    "3. Ensure your editor uses the workspace TypeScript version:",
    "",
    '   <Aside type="tip">',
    '     Select "Use Workspace Version".',
    "   </Aside>",
  ].join("\n")

  assert.equal(
    docsBodyToMarkdown(body),
    [
      "3. Ensure your editor uses the workspace TypeScript version:",
      "",
      "   > **Tip**",
      "   >",
      '   > Select "Use Workspace Version".',
      "",
    ].join("\n"),
  )
})

test("unwraps Tabs/TabItem into bold labels with content", () => {
  const body = [
    '<Tabs syncKey="package-manager">',
    "",
    '<TabItem label="npm">',
    "",
    "```sh showLi",
    "npm install effect",
    "```",
    "",
    "</TabItem>",
    "",
    '<TabItem label="pnpm">',
    "",
    "pnpm add effect",
    "",
    "</TabItem>",
    "",
    "</Tabs>",
  ].join("\n")

  assert.equal(
    docsBodyToMarkdown(body),
    [
      "**npm**",
      "",
      "```sh",
      "npm install effect",
      "```",
      "",
      "**pnpm**",
      "",
      "pnpm add effect",
      "",
    ].join("\n"),
  )
})

test("unwraps Steps keeping their ordered lists", () => {
  const body = [
    "<Steps>",
    "",
    "1. **Install dependencies**",
    "",
    "   Run the command.",
    "",
    "2. Done.",
    "",
    "</Steps>",
  ].join("\n")

  assert.equal(
    docsBodyToMarkdown(body),
    [
      "1. **Install dependencies**",
      "",
      "   Run the command.",
      "",
      "2. Done.",
      "",
    ].join("\n"),
  )
})

test("converts Badges into bold text, including inside tables", () => {
  const body = [
    "| Module | Description | Status |",
    "| ------ | ----------- | ------ |",
    '| [Path](/docs/v4/platform/path/) | Utilities for paths. | <Badge text="Stable" variant="success" /> |',
  ].join("\n")

  assert.equal(
    docsBodyToMarkdown(body),
    [
      "| Module | Description | Status |",
      "| ------ | ----------- | ------ |",
      "| [Path](/docs/v4/platform/path/) | Utilities for paths. | **Stable** |",
      "",
    ].join("\n"),
  )
})

test("leaves TypeScript generics in prose untouched", () => {
  const body = "The `Effect<A, E>` type where `A extends Request.Entry<T>`."
  assert.equal(docsBodyToMarkdown(body), `${body}\n`)
})

// ---------------------------------------------------------------------------
// Integration: transform every real docs source and verify no MDX artifacts
// survive outside of code fences.
// ---------------------------------------------------------------------------

const DOCS_DIR = join(import.meta.dirname, "../../../src/content/docs")

function walkMdx(dir: string): Array<string> {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return walkMdx(path)
    return /\.(md|mdx)$/.test(name) ? [path] : []
  })
}

const componentTagPattern = /<\/?[A-Z][\w$-]*(?:\s[^<>]*)?\/>/g
const importPattern = /^import\s/gm

for (const file of walkMdx(DOCS_DIR)) {
  test(`markdown output has no MDX artifacts: ${file.replace(DOCS_DIR + "/", "")}`, () => {
    const body = stripFrontmatter(readFileSync(file, "utf8"))
    const markdown = docsBodyToMarkdown(body)
    const prose = splitFenceSegments(markdown)
      .filter((segment) => segment.kind === "prose")
      .map((segment) => segment.text)
      .join("\n")
    assert.deepEqual(
      [...prose.matchAll(componentTagPattern)].map((m) => m[0]),
      [],
    )
    assert.deepEqual(
      [...prose.matchAll(importPattern)].map((m) => m[0]),
      [],
    )
  })
}

test("reduces styled HTML blocks to plain markdown", () => {
  const body = [
    "Intro.",
    "",
    '<div class="not-prose p-4">',
    '  <div class="font-mono">Out of the box</div>',
    '  <dl class="grid">',
    '    <div class="px-4"><dt class="text-sm">Typed errors</dt>',
    '      <dd class="mt-1">Failures live in the signature.</dd></div>',
    "  </dl>",
    "</div>",
    "",
    '<ol class="list-none">',
    '  <li class="pl-0">',
    '    <a href="/docs/v4/x" class="group flex">',
    '      <span aria-hidden="true">01</span>',
    '      <span class="flex-1">Start here</span>',
    "    </a>",
    "  </li>",
    "</ol>",
  ].join("\n")
  assert.equal(
    docsBodyToMarkdown(body),
    [
      "Intro.",
      "",
      "Out of the box",
      "",
      "- **Typed errors**: Failures live in the signature.",
      "",
      "- [01 Start here](/docs/v4/x)",
      "",
    ].join("\n"),
  )
})

test("keeps HTML-like text in code spans and fences, flattens inline tags", () => {
  const body = [
    'Value is 10<sup>-scale</sup>, see `<div class="x">` and Array<string>.',
    "",
    "```html",
    '<div class="x"><a href="/y">y</a></div>',
    "```",
  ].join("\n")
  assert.equal(
    docsBodyToMarkdown(body),
    [
      'Value is 10^-scale, see `<div class="x">` and Array<string>.',
      "",
      "```html",
      '<div class="x"><a href="/y">y</a></div>',
      "```",
      "",
    ].join("\n"),
  )
})
