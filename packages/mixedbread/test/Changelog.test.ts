import * as Schema from "effect/Schema"
import { assert, test } from "vite-plus/test"
import { parse as parseYaml } from "yaml"
import { ChangelogSearchMetadata } from "@website/domain/SearchMetadata"
import { stageChangelog } from "../src/Changelog.ts"

const source = `---
package: "@effect/platform"
slug: "platform"
channel: "v4"
packageVersion: "0.90.1"
revision: "abc1234"
sourceUrl: "https://github.com/Effect-TS/effect/blob/abc1234/packages/platform/CHANGELOG.md"
---

## 0.90.1

### Patch Changes

- Fix retry with generics Effect<A, E> and object { a: 1 } inline ([#1234](https://github.com/Effect-TS/effect/pull/1234))

## Runtime performance

Not a version heading and must be excluded from the version list.

## 0.90.0

### Minor Changes

- Add \`HttpApi.group\`
`

test("stages released-version sections with heading-slug anchors", () => {
  const document = stageChangelog(source, "v4/platform.md")

  assert.ok(document)
  assert.equal(document.metadata.content_source, "changelog")
  assert.equal(document.metadata.page_href, "/docs/v4/api/platform/changelog")
  assert.deepEqual(
    document.metadata.sections.map(({ title, anchor }) => ({ title, anchor })),
    [
      { title: "@effect/platform", anchor: "" },
      { title: "0.90.1", anchor: "0901" },
      { title: "0.90.0", anchor: "0900" },
    ],
  )

  const lines = document.source.split("\n")
  for (const section of document.metadata.sections.slice(1)) {
    assert.match(lines[section.line - 1] ?? "", /^## /)
  }

  const yaml = /^---\n([\s\S]*?)\n---/.exec(document.source)?.[1]
  assert.ok(yaml)
  const stagedMetadata = Schema.decodeUnknownSync(
    Schema.Struct({ search: ChangelogSearchMetadata }),
  )(parseYaml(yaml))
  assert.equal(stagedMetadata.search.sections[1]?.anchor, "0901")
})

test("skips changelogs without released versions", () => {
  const document = stageChangelog(
    `---
package: "@effect/empty"
slug: "empty"
channel: "v4"
packageVersion: "0.0.0"
revision: "abc1234"
sourceUrl: "https://github.com/Effect-TS/effect/blob/abc1234/packages/empty/CHANGELOG.md"
---

No changelog entries.
`,
    "v4/empty.md",
  )

  assert.equal(document, undefined)
})
