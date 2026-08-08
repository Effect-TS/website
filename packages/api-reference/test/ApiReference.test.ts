import { TypeDocProjectReflection } from "@website/domain/ApiReference"
import * as Schema from "effect/Schema"
import { assert, test } from "vite-plus/test"
import { ReflectionKind } from "typedoc"
import { ApiReference } from "../src/ApiReference.ts"

test("renders Markdown tables in module comments", () => {
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
                "| math | `number` |",
              ].join("\n"),
            },
          ],
        },
      },
    ],
  })

  assert.equal(
    ApiReference.moduleView(reflection).commentHtml,
    '<div class="api-table"><table><thead><tr><th>Category</th><th>Domain</th></tr></thead><tbody><tr><td>math</td><td><code>number</code></td></tr></tbody></table></div>',
  )
})
