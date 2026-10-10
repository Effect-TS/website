import { assert, test } from "vite-plus/test"
import * as Effect from "effect/Effect"
import type {
  LlmsScope,
  LlmsSection,
} from "../../../src/features/llms/domain.ts"
import {
  renderRootFull,
  renderRootIndex,
  renderScopeFull,
  renderScopeIndex,
} from "../../../src/features/llms/render.ts"

const site = new URL("https://effect.website")

const sections: ReadonlyArray<LlmsSection> = [
  {
    title: "Start",
    pages: [
      {
        title: "Intro",
        description: "First\npage.",
        path: "/docs/v4/intro",
        markdown: "# Intro\n\nHello\n",
      },
    ],
  },
  { title: "Empty", pages: [] },
]

const scope: LlmsScope = {
  kind: "docs",
  params: { version: "v4" },
  path: "/docs/v4",
  title: "Docs",
  summary: "Guides.",
  inRootFull: true,
  sections: Effect.succeed(sections),
}

test("scope index lists markdown twins and skips empty sections", () => {
  const index = renderScopeIndex(scope, sections, site)
  assert.include(index, "# Docs\n\n> Guides.\n")
  assert.include(
    index,
    "- [Intro](https://effect.website/docs/v4/intro.md): First page.",
  )
  assert.include(index, "/docs/v4/llms-full.txt")
  assert.notInclude(index, "## Empty")
})

test("scope full prefixes each page with source frontmatter", () => {
  assert.include(
    renderScopeFull(scope, sections, site),
    '---\ntitle: "Intro"\ndescription: "First page."\nsource: https://effect.website/docs/v4/intro\n---\n\n# Intro\n\nHello\n',
  )
})

test("root index links every scope", () => {
  assert.include(
    renderRootIndex([scope], site),
    "(https://effect.website/docs/v4/llms.txt)",
  )
})

test("root full joins scope files under the root header", () => {
  const full = renderRootFull(["SCOPE A", "SCOPE B"])
  assert.match(full, /^# Effect\n/)
  assert.include(full, "SCOPE A\nSCOPE B")
})

test("truncates long descriptions", () => {
  const index = renderScopeIndex(
    scope,
    [
      {
        title: "S",
        pages: [
          {
            title: "T",
            description: "a".repeat(400),
            path: "/t",
            markdown: "",
          },
        ],
      },
    ],
    site,
  )
  assert.include(index, `${"a".repeat(299)}…`)
})
