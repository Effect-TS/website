import { assert, test } from "vite-plus/test"
import * as SearchChanges from "../src/SearchChanges.ts"

test("detects search index source changes", () => {
  const paths = [
    "apps/web/src/content/docs/getting-started.mdx",
    "apps/web/src/content/blog/release.mdx",
    "apps/web/src/content.config.ts",
    "apps/web/src/features/api-reference/model.ts",
    "apps/web/src/features/search/domain.ts",
    "packages/domain/src/ApiReference.ts",
    "packages/api-reference/src/Generate.ts",
    "packages/mixedbread/src/Mixedbread.ts",
    "packages/alchemy-mixedbread/src/VectorStore.ts",
    "apps/web/package.json",
    "package.json",
    "pnpm-lock.yaml",
    "alchemy.run.ts",
    ".github/workflows/preview.yml",
  ]

  for (const path of paths) {
    assert.equal(SearchChanges.includes(path), true, path)
  }
})

test("ignores unrelated changes and similar prefixes", () => {
  const paths = [
    "README.md",
    "apps/web/src/pages/index.astro",
    "apps/web/src/content/docs-notes/example.mdx",
    "packages/domain-old/src/index.ts",
    ".github/workflows/check.yml",
  ]

  assert.equal(SearchChanges.any(paths), false)
})
