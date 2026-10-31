import { assert, test } from "vite-plus/test"
import { readdirSync, readFileSync } from "node:fs"
import { join, relative } from "node:path"
import { lessonSlug } from "../../../src/features/learn/routes.ts"

// The Worker has a size limit, and request-time rendering of content entries
// or highlighted code pulls Astro's content-module map and the Shiki runtime
// into it. Lesson pages are prerendered instead, so the cross-origin isolation
// the playground needs comes from public/_headers, not from the response.

const web = join(import.meta.dirname, "..", "..", "..")
const pages = join(web, "src", "pages")
const learn = join(web, "src", "content", "learn")

const files = (directory: string): ReadonlyArray<string> =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? files(join(directory, entry.name))
      : [join(directory, entry.name)],
  )

test("no on-demand page renders content entries or highlights code at request time", () => {
  const offenders = files(pages).filter((file) => {
    const source = readFileSync(file, "utf8")
    if (!/export const prerender = false/.test(source)) return false
    return (
      /import\s*\{[^}]*\brender\b[^}]*\}\s*from\s*"astro:content"/.test(
        source,
      ) || /from\s*"astro-expressive-code\/components"/.test(source)
    )
  })

  assert.deepEqual(
    offenders.map((file) => relative(web, file)),
    [],
  )
})

// Cloudflare's _headers format: an unindented URL pattern, then indented
// `Name: value` lines. `*` matches anything, `:name` one path segment.
const headerRules = () => {
  const rules: Array<{ pattern: RegExp; headers: Map<string, string> }> = []
  for (const line of readFileSync(
    join(web, "public", "_headers"),
    "utf8",
  ).split("\n")) {
    if (line.trim() === "" || line.trim().startsWith("#")) continue
    if (/^\s/.test(line)) {
      const [name, ...value] = line.trim().split(":")
      rules.at(-1)?.headers.set(name!.toLowerCase(), value.join(":").trim())
      continue
    }
    const source = line
      .trim()
      .split(/(\*|:[A-Za-z]\w*)/)
      .map((part) =>
        part === "*"
          ? ".*"
          : part.startsWith(":")
            ? "[^/]+"
            : part.replace(/[.+?^${}()|[\]\\]/g, "\\$&"),
      )
      .join("")
    rules.push({ pattern: new RegExp(`^${source}$`), headers: new Map() })
  }
  return rules
}

const headersFor = (path: string) =>
  new Map(
    headerRules()
      .filter(({ pattern }) => pattern.test(path))
      .flatMap(({ headers }) => [...headers]),
  )

const lessons = () =>
  files(learn)
    .filter((file) => file.endsWith(".mdx"))
    .map((file) => {
      const frontmatter = readFileSync(file, "utf8").split("---")[1] ?? ""
      const field = (name: string) =>
        new RegExp(`^${name}:\\s*(.+)$`, "m").exec(frontmatter)?.[1]?.trim()
      const id = relative(learn, file)
        .replace(/^part-\d+\/\d+-/, "")
        .replace(/\.mdx$/, "")
      const data = {
        part: Number(field("part")),
        order: Number(field("order")),
      }
      return { slug: lessonSlug({ id, data }), mode: field("mode") }
    })

test("playground lessons and their playground-only view are cross-origin isolated", () => {
  const playground = lessons().filter(({ mode }) => mode === "playground")
  assert.isNotEmpty(playground)

  for (const { slug } of playground) {
    for (const path of [`/learn/${slug}`, `/learn/${slug}/playground`]) {
      const headers = headersFor(path)
      assert.equal(
        headers.get("cross-origin-embedder-policy"),
        "require-corp",
        path,
      )
      assert.equal(
        headers.get("cross-origin-opener-policy"),
        "same-origin",
        path,
      )
    }
  }
})

test("the course landing and local lessons are not cross-origin isolated", () => {
  const local = lessons().filter(({ mode }) => mode === "local")
  assert.isNotEmpty(local)

  for (const path of ["/learn", ...local.map(({ slug }) => `/learn/${slug}`)]) {
    assert.isFalse(headersFor(path).has("cross-origin-embedder-policy"), path)
  }
})
