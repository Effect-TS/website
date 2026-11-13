import type { ApiDeclaration } from "@website/api-reference/ApiReference"
import { assert, test } from "vite-plus/test"
import {
  declarationChunkTexts,
  declarationMarkdown,
  splitText,
} from "../src/ApiReferenceFiles.ts"
import { MAX_MIXEDBREAD_TEXT_LENGTH } from "../src/Config.ts"

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
    stability: undefined,
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

const baseDeclaration: ApiDeclaration = {
  anchor: "OpenRouterClient",
  category: "Models",
  commentHtml: undefined,
  commentMarkdown: "The OpenRouter client.",
  examples: [],
  id: 1,
  kind: "interface",
  name: "OpenRouterClient",
  signature: undefined,
  since: "4.0.0",
  sourceUrl: undefined,
  stability: undefined,
  typeKind: undefined,
}

const chunkOptions = (declaration: ApiDeclaration) => ({
  declaration,
  declarationHref:
    "/docs/v4/api/ai-openrouter/OpenRouterClient#OpenRouterClient",
  modulePath: "OpenRouterClient",
  packageName: "@effect/ai-openrouter",
})

const fencedContents = (text: string): Array<string> =>
  Array.from(text.matchAll(/```typescript\n([\s\S]*?)\n```/g), (m) => m[1]!)

test("splitText fragments are bounded and rejoin to the original text", () => {
  const text = [
    "short line",
    "x".repeat(250),
    "😀".repeat(80),
    "",
    "tail",
  ].join("\n")
  for (const budget of [2, 3, 7, 64, 100, 1_000]) {
    const fragments = splitText(text, budget)
    assert.strictEqual(fragments.join(""), text)
    for (const fragment of fragments) {
      assert.isAtMost(fragment.length, budget)
      assert.isAbove(fragment.length, 0)
      // Never leave a lone surrogate at either end of a fragment.
      assert.notMatch(fragment, /^[\uDC00-\uDFFF]|[\uD800-\uDBFF]$/)
    }
  }
  assert.deepStrictEqual(splitText("", 10), [""])
})

test("declarations that fit produce a single chunk identical to declarationMarkdown", () => {
  const options = chunkOptions({
    ...baseDeclaration,
    signature: "export interface OpenRouterClient {}",
  })
  assert.deepStrictEqual(declarationChunkTexts(options), [
    declarationMarkdown(options),
  ])
})

test("oversized multi-line signatures are split without losing any line", () => {
  const lines = Array.from(
    { length: 20_000 },
    (_, index) => `  readonly field${index}: string`,
  )
  const signature = `export interface OpenRouterClient {\n${lines.join("\n")}\n}`
  const options = chunkOptions({
    ...baseDeclaration,
    signature,
    examples: [
      {
        language: "typescript",
        ownerId: 1,
        ownerName: "OpenRouterClient",
        since: undefined,
        source: "const client = yield* OpenRouterClient",
        sourceUrl: undefined,
        title: "Usage",
      },
    ],
  })
  assert.isAbove(
    declarationMarkdown(options).length,
    MAX_MIXEDBREAD_TEXT_LENGTH,
  )

  const chunks = declarationChunkTexts(options)
  assert.isAbove(chunks.length, 1)
  chunks.forEach((chunk, index) => {
    assert.isAtMost(chunk.length, MAX_MIXEDBREAD_TEXT_LENGTH)
    assert.isTrue(
      chunk.startsWith(
        `# OpenRouterClient (part ${index + 1} of ${chunks.length})\n`,
      ),
    )
    assert.include(chunk, "API reference: /docs/v4/api/ai-openrouter/")
  })

  const all = chunks.join("\n")
  assert.include(all, "The OpenRouter client.")
  assert.include(all, "## Usage")
  assert.include(all, "const client = yield* OpenRouterClient")
  // The signature fragments, in order, rebuild the original signature.
  const signatureParts = chunks.flatMap((chunk) =>
    fencedContents(chunk).filter(
      (content) => content !== "const client = yield* OpenRouterClient",
    ),
  )
  assert.strictEqual(signatureParts.join("\n"), signature)
})

test("a single line longer than the limit is hard-split losslessly", () => {
  const signature = Array.from(
    { length: 30_000 },
    (_, index) => `T${index}`,
  ).join("|")
  assert.notInclude(signature, "\n")
  const options = chunkOptions({ ...baseDeclaration, signature })
  const chunks = declarationChunkTexts(options, 10_000)
  assert.isAbove(chunks.length, 1)
  for (const chunk of chunks) assert.isAtMost(chunk.length, 10_000)
  assert.strictEqual(chunks.flatMap(fencedContents).join(""), signature)
})
