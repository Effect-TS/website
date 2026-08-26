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

test("extracts module, declaration, and signature examples without losing prose", () => {
  const reflection = Schema.decodeUnknownSync(TypeDocProjectReflection)({
    schemaVersion: "2.0",
    id: 1,
    name: "effect/Example",
    variant: "project",
    kind: ReflectionKind.Project,
    flags: {},
    children: [
      {
        id: 2,
        name: "Example",
        variant: "declaration",
        kind: ReflectionKind.Module,
        flags: {},
        comment: {
          summary: [
            { kind: "text", text: "Module docs\n\n**Example** (Module)\n\n" },
            {
              kind: "code",
              text: "```ts import.meta.vitest\nconst moduleExample = true\n```",
            },
            { kind: "text", text: "\n\nAfter the example." },
          ],
        },
        children: [
          {
            id: 3,
            name: "direct",
            variant: "declaration",
            kind: ReflectionKind.Variable,
            flags: {},
            comment: {
              summary: [{ kind: "text", text: "Direct docs." }],
              blockTags: [
                {
                  tag: "@example",
                  name: "Direct",
                  content: [
                    {
                      kind: "code",
                      text: "```sh\nprintf direct\n```",
                    },
                  ],
                },
              ],
            },
          },
          {
            id: 4,
            name: "fromSignature",
            variant: "declaration",
            kind: ReflectionKind.Function,
            flags: {},
            signatures: [
              {
                id: 5,
                name: "fromSignature",
                variant: "signature",
                kind: ReflectionKind.CallSignature,
                flags: {},
                type: { type: "intrinsic", name: "void" },
                comment: {
                  summary: [
                    {
                      kind: "text",
                      text: "Signature docs.\n\n**Example** (Signature)\n\n",
                    },
                    {
                      kind: "code",
                      text: "```ts import.meta.vitest\nconst signatureExample = true\n```",
                    },
                  ],
                },
              },
            ],
          },
          {
            id: 6,
            name: "unsupported",
            variant: "declaration",
            kind: ReflectionKind.Variable,
            flags: {},
            comment: {
              summary: [
                { kind: "text", text: "**Example**\n\n" },
                { kind: "code", text: "```mermaid\ngraph TD\n```" },
                { kind: "text", text: "\n\nStill documented." },
              ],
            },
          },
        ],
      },
    ],
  })

  const view = ApiReference.moduleView(reflection)
  assert.equal(view.examples.length, 1)
  assert.equal(view.examples[0]?.language, "typescript")
  assert.equal(view.examples[0]?.title, "Module")
  assert.match(view.commentHtml ?? "", /After the example\./)

  const declarations = view.groups.flatMap((group) => group.declarations)
  const direct = declarations.find(
    (declaration) => declaration.name === "direct",
  )
  assert.equal(direct?.examples[0]?.language, "bash")
  assert.equal(direct?.examples[0]?.title, "Direct")

  const fromSignature = declarations.find(
    (declaration) => declaration.name === "fromSignature",
  )
  assert.equal(fromSignature?.examples[0]?.ownerId, 4)
  assert.equal(fromSignature?.examples[0]?.title, "Signature")

  const unsupported = declarations.find(
    (declaration) => declaration.name === "unsupported",
  )
  assert.equal(unsupported?.examples.length, 0)
  assert.match(unsupported?.commentHtml ?? "", /mermaid/)
  assert.match(unsupported?.commentHtml ?? "", /Still documented\./)
})

test("renders TypeDoc inline links with their intended semantics", () => {
  const reflection = Schema.decodeUnknownSync(TypeDocProjectReflection)({
    schemaVersion: "2.0",
    id: 1,
    name: "effect/Links",
    variant: "project",
    kind: ReflectionKind.Project,
    flags: {},
    children: [
      {
        id: 2,
        name: "Links",
        variant: "declaration",
        kind: ReflectionKind.Module,
        flags: {},
        children: [
          {
            id: 3,
            name: "source",
            variant: "declaration",
            kind: ReflectionKind.Function,
            flags: {},
            comment: {
              summary: [
                { kind: "text", text: "Use " },
                { kind: "inline-tag", tag: "@link", text: "target", target: 4 },
                { kind: "text", text: ", " },
                {
                  kind: "inline-tag",
                  tag: "@linkcode",
                  text: "external",
                  target: "https://example.com/reference?a=1&b=2",
                },
                { kind: "text", text: ", " },
                {
                  kind: "inline-tag",
                  tag: "@link",
                  text: "`target as code`",
                  target: 4,
                },
                { kind: "text", text: ", " },
                {
                  kind: "inline-tag",
                  tag: "@linkplain",
                  text: "Effect.Effect | an effect",
                  tsLinkText: "an effect",
                  target: {
                    packageName: "effect",
                    packagePath: "src/Effect.ts",
                    qualifiedName: "Effect",
                  },
                },
                { kind: "text", text: ", and " },
                {
                  kind: "inline-tag",
                  tag: "@linkcode",
                  text: "Missing",
                },
                { kind: "text", text: "." },
              ],
              blockTags: [
                {
                  tag: "@see",
                  content: [
                    {
                      kind: "inline-tag",
                      tag: "@link",
                      text: "target",
                      target: 4,
                    },
                  ],
                },
              ],
            },
          },
          {
            id: 4,
            name: "target",
            variant: "declaration",
            kind: ReflectionKind.Variable,
            flags: {},
          },
        ],
      },
    ],
  })

  const view = ApiReference.moduleView(reflection, {
    moduleHref: (modulePath) => `/docs/v4/api/effect/${modulePath}`,
    modulePath: "Links",
    resolveSymbolHref: (target) =>
      target.packageName === "effect" && target.packagePath === "src/Effect.ts"
        ? "/docs/v4/api/effect/Effect"
        : undefined,
  })
  const source = view.groups
    .flatMap((group) => group.declarations)
    .find((declaration) => declaration.name === "source")
  const html = source?.commentHtml ?? ""

  assert.match(html, /href="\/docs\/v4\/api\/effect\/Links#target">target<\/a>/)
  assert.match(
    html,
    /href="https:\/\/example\.com\/reference\?a=1&#x26;b=2"><code>external<\/code><\/a>/,
  )
  assert.match(
    html,
    /href="\/docs\/v4\/api\/effect\/Links#target"><code>target as code<\/code><\/a>/,
  )
  assert.match(html, /href="\/docs\/v4\/api\/effect\/Effect">an effect<\/a>/)
  assert.match(html, /and <code>Missing<\/code>\./)
  assert.match(html, /<h4>See<\/h4>/)
  assert.match(
    html,
    /<li><a href="\/docs\/v4\/api\/effect\/Links#target">target<\/a><\/li>/,
  )
  assert.match(source?.commentMarkdown ?? "", /\[target\]/)
  assert.match(source?.commentMarkdown ?? "", /#### See/)
})
