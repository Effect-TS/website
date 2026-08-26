import type { ApiDeclaration } from "@website/api-reference/ApiReference"
import { assert, test } from "vite-plus/test"
import { declarationMarkdown } from "../src/ApiReferenceFiles.ts"

test("includes resolved comment links and examples in API search Markdown", () => {
  const declaration: ApiDeclaration = {
    anchor: "run",
    category: "Runners",
    commentHtml: undefined,
    commentMarkdown: "See [Effect](</docs/v4/api/effect/Effect>).",
    examples: [
      {
        language: "typescript",
        ownerId: 1,
        ownerName: "run",
        since: undefined,
        source: "Effect.runSync(program)",
        sourceUrl: undefined,
        title: "Run synchronously",
      },
    ],
    id: 1,
    kind: "function",
    name: "run",
    signature: undefined,
    since: undefined,
    sourceUrl: undefined,
    typeKind: undefined,
  }

  const markdown = declarationMarkdown({
    declaration,
    declarationHref: "/docs/v4/api/effect/Effect#run",
    modulePath: "Effect",
    packageName: "effect",
  })

  assert.match(
    markdown,
    /See \[Effect\]\(<\/docs\/v4\/api\/effect\/Effect>\)\./,
  )
  assert.match(markdown, /## Run synchronously/)
  assert.match(markdown, /```typescript\nEffect\.runSync\(program\)\n```/)
})
