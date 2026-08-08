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
        children: [
          {
            id: 3,
            name: "parse",
            variant: "declaration",
            kind: ReflectionKind.Function,
            flags: {},
          },
          {
            id: 4,
            name: "sum",
            variant: "declaration",
            kind: ReflectionKind.Function,
            flags: {},
          },
        ],
        comment: {
          summary: [
            {
              kind: "text",
              text: [
                "| Category | Domain |",
                "| --- | --- |",
                "| | |",
                "| math | module:Number.parse |",
                "| errors | module:Number.Missing |",
                "",
                "## Composition Patterns",
                "",
                "- Chain operations",
                "- Handle failures",
                "",
                "See also ",
              ].join("\n"),
            },
            {
              kind: "inline-tag",
              tag: "@link",
              text: "module:Number.sum",
            },
            { kind: "text", text: "." },
          ],
          blockTags: [
            {
              tag: "@see",
              content: [
                {
                  kind: "text",
                  text: [
                    " - module:BigInt for integer operations",
                    " - module:BigDecimal for decimal operations",
                  ].join("\n"),
                },
              ],
            },
          ],
        },
      },
    ],
  })

  const html = ApiReference.moduleView(reflection, {
    moduleHref: (modulePath) => `/docs/v3/api/effect/${modulePath}`,
    modulePath: "Number",
  }).commentHtml
  assert.ok(html)
  assert.equal(html.match(/<tr>/g)?.length, 3)
  assert.match(
    html,
    /<td><a href="\/docs\/v3\/api\/effect\/Number#parse"><code>parse<\/code><\/a><\/td>/,
  )
  assert.match(html, /<td><code>Missing<\/code><\/td>/)
  assert.match(html, /<h2>Composition Patterns<\/h2>/)
  assert.match(
    html,
    /See also <a href="\/docs\/v3\/api\/effect\/Number#sum"><code>sum<\/code><\/a>\./,
  )
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
    /<a href="\/docs\/v3\/api\/effect\/BigDecimal"><code>BigDecimal<\/code><\/a> for decimal operations/,
  )
  assert.equal(/<li>\s*<ul>/.test(html), false)
  assert.equal(/module:/.test(html), false)
})
