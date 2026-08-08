import { TypeDocProjectReflection } from "@website/domain/ApiReference"
import * as Schema from "effect/Schema"
import { assert, test } from "vite-plus/test"
import { ReflectionKind } from "typedoc"
import { ApiReference } from "../src/ApiReference.ts"

test("renders GFM module comments without empty table rows", () => {
  const reflection = Schema.decodeUnknownSync(TypeDocProjectReflection)({
    schemaVersion: "2.0",
    id: 1,
    name: "effect/Number",
    variant: "project",
    kind: ReflectionKind.Project,
    flags: {},
    children: [
      {
        id: 2,
        name: "Number",
        variant: "declaration",
        kind: ReflectionKind.Module,
        flags: {},
        children: [],
        comment: {
          summary: [
            {
              kind: "text",
              text: [
                "| Category | Domain |",
                "| --- | --- |",
                "| | |",
                "| math | `number` |",
                "",
                "## Composition Patterns",
                "",
                "- Chain operations",
                "- Handle failures",
              ].join("\n"),
            },
          ],
          blockTags: [
            {
              tag: "@see",
              content: [
                {
                  kind: "inline-tag",
                  tag: "@link",
                  text: "module:BigInt",
                  tsLinkText: "module:BigInt",
                },
                { kind: "text", text: " for integer operations" },
              ],
            },
            {
              tag: "@see",
              content: [
                {
                  kind: "inline-tag",
                  tag: "@link",
                  text: "module:Number.parse",
                  tsLinkText: "module:Number.parse",
                },
                { kind: "text", text: " for parsing" },
              ],
            },
          ],
        },
      },
    ],
  })

  const html = ApiReference.moduleView(reflection, {
    moduleHref: (modulePath) => `/docs/v3/api/effect/${modulePath}`,
  }).commentHtml
  assert.ok(html)
  assert.equal(html.match(/<tr>/g)?.length, 2)
  assert.match(html, /<td><code>number<\/code><\/td>/)
  assert.match(html, /<h2>Composition Patterns<\/h2>/)
  assert.match(
    html,
    /<ul>\s*<li>Chain operations<\/li>\s*<li>Handle failures<\/li>\s*<\/ul>/,
  )
  assert.match(
    html,
    /<a href="\/docs\/v3\/api\/effect\/BigInt"><code>BigInt<\/code><\/a> for integer operations/,
  )
  assert.match(
    html,
    /<a href="\/docs\/v3\/api\/effect\/Number#parse"><code>parse<\/code><\/a> for parsing/,
  )
  assert.equal(/module:/.test(html), false)
})
