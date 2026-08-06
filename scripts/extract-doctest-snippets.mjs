// Reproduces @effect/doctest's markdown extraction over src/content/docs/v4/**/*.mdx
// and writes one .ts file per marked snippet to test-results/doctest/, for the G2 type gate.
import { mkdir, readdir, rm, writeFile } from "node:fs/promises"
import { extname, join, relative, sep } from "node:path"
import { extractFile } from "@effect/doctest/Source"

const root = new URL("..", import.meta.url).pathname
const docsDir = join(root, "src/content/docs/v4")
const outDir = join(root, "test-results/doctest")

const twoslashAnnotationLine =
  /^\s*\/\/\s*(\^\?|---cut(-after|-start|-end)?---|@\w|[┌└│▼▲├┤┬┴])/

const walk = async (dir) => {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await walk(full)))
    } else if (entry.isFile() && extname(entry.name) === ".mdx") {
      files.push(full)
    }
  }
  return files
}

const slugify = (file) => relative(docsDir, file).replace(/\.mdx$/, "").split(sep).join("-")

const stripTwoslashAnnotations = (source) =>
  source
    .split("\n")
    .filter((line) => !twoslashAnnotationLine.test(line))
    .join("\n")

// A .ts file with no import/export is a TS "script", not a module: its
// top-level declarations join the global scope shared by every other script
// file in the same tsc project, so two unrelated snippets that happen to
// declare the same identifier (e.g. two different docs' `const divide = ...`)
// collide. Force module scope so each snippet's file is self-contained.
const hasImportOrExport = /^\s*(import|export)\b/m
const ensureModuleScope = (source) => (hasImportOrExport.test(source) ? source : `${source}\nexport {}\n`)

const main = async () => {
  await rm(outDir, { recursive: true, force: true })
  await mkdir(outDir, { recursive: true })

  const files = await walk(docsDir)
  let total = 0

  for (const file of files) {
    const snippets = await extractFile(file)
    if (snippets.length === 0) continue

    const slug = slugify(file)
    const dir = join(outDir, slug)
    await mkdir(dir, { recursive: true })

    snippets.forEach((snippet, index) => {
      const name = snippet.name ?? `unnamed-${index + 1}`
      const body = ensureModuleScope(stripTwoslashAnnotations(snippet.source))
      writeFile(join(dir, `${index + 1}-${name}.ts`), body, "utf8")
      total++
    })
  }

  console.log(`extracted ${total} snippet(s) from ${files.length} file(s) into ${relative(root, outDir)}`)
}

main()
