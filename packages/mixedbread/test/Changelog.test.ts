import * as Schema from "effect/Schema"
import { assert, test } from "vite-plus/test"
import { parse as parseYaml } from "yaml"
import { ChangelogSearchMetadata } from "@website/domain/SearchMetadata"
import { stageChangelogReleases } from "../src/Changelog.ts"

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

Not a version heading and must stay inside the 0.90.1 release.

## 0.90.0

### Minor Changes

- Add \`HttpApi.group\`
`

test("stages one document per released version", () => {
  const releases = stageChangelogReleases(source, "v4/platform.md")

  assert.deepEqual(
    releases.map((release) => release.version),
    ["0.90.1", "0.90.0"],
  )

  for (const release of releases) {
    assert.equal(release.metadata.content_source, "changelog")
    assert.equal(release.metadata.page_href, "/docs/v4/api/platform/changelog")
    assert.equal(release.metadata.page_title, "@effect/platform")
  }
})

test("scopes each release frontmatter to a single version", () => {
  const [latest] = stageChangelogReleases(source, "v4/platform.md")

  assert.ok(latest)
  assert.deepEqual(
    latest.metadata.sections.map(({ title, anchor }) => ({ title, anchor })),
    [
      { title: "@effect/platform", anchor: "" },
      { title: "0.90.1", anchor: "0901" },
    ],
  )

  const lines = latest.source.split("\n")
  for (const section of latest.metadata.sections.slice(1)) {
    assert.match(lines[section.line - 1] ?? "", /^## /)
  }

  const yaml = /^---\n([\s\S]*?)\n---/.exec(latest.source)?.[1]
  assert.ok(yaml)
  const parsed = parseYaml(yaml)
  // The package-wide `versions`, `revision`, and `sourceUrl` keys never enter a
  // release document, so its frontmatter stays under the metadata cap.
  assert.equal(parsed.packageVersion, "0.90.1")
  assert.equal(parsed.versions, undefined)
  assert.equal(parsed.revision, undefined)
  assert.equal(parsed.sourceUrl, undefined)

  const stagedMetadata = Schema.decodeUnknownSync(
    Schema.Struct({ search: ChangelogSearchMetadata }),
  )(parsed)
  assert.equal(stagedMetadata.search.sections[1]?.anchor, "0901")
})

test("returns no documents without released versions", () => {
  const releases = stageChangelogReleases(
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

  assert.deepEqual(releases, [])
})
