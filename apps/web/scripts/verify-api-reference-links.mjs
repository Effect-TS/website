import { readdir, readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const staticRoot = path.resolve(
  process.argv[2] ??
    fileURLToPath(new URL("../.vercel/output/static", import.meta.url)),
)
const docsRoot = path.join(staticRoot, "docs")
const htmlByPath = new Map()
const failures = []

for (const filePath of await htmlFiles(docsRoot)) {
  const html = await readFile(filePath, "utf8")
  htmlByPath.set(filePath, html)

  for (const match of html.matchAll(
    /href="(https:\/\/effect-ts\.github\.io\/effect\/[^"]+)"/g,
  )) {
    failures.push(`${relative(filePath)} uses legacy API link ${match[1]}`)
  }

  for (const match of html.matchAll(/href="(\/docs\/(?!v[34]\/)[^"]+)"/g)) {
    if (match[1] !== "/docs/") {
      failures.push(
        `${relative(filePath)} uses unversioned documentation link ${match[1]}`,
      )
    }
  }

  const visibleHtml = html
    .replace(/<pre\b[\s\S]*?<\/pre>/gi, "")
    .replace(/<code\b[\s\S]*?<\/code>/gi, "")
    .replace(/<[^>]+>/g, "")
  const unresolved = visibleHtml.match(
    /\bmodule:[A-Za-z0-9_/-]+(?:\.[A-Za-z0-9_$-]+)?/g,
  )
  if (unresolved !== null) {
    failures.push(
      `${relative(filePath)} contains unresolved references: ${[...new Set(unresolved)].join(", ")}`,
    )
  }

  for (const match of html.matchAll(
    /href="(\/docs\/v[34](?:\/[^"#?]+)?(?:#[^"]+)?)"/g,
  )) {
    const href = match[1]
    if (href === undefined) continue
    const url = new URL(href, "https://effect.website")
    const targetPath = path.join(
      staticRoot,
      decodeURIComponent(url.pathname),
      "index.html",
    )
    const targetHtml = await loadHtml(targetPath)
    if (targetHtml === undefined) {
      failures.push(`${relative(filePath)} links to missing page ${href}`)
      continue
    }
    if (url.hash.length === 0) continue
    const fragment = decodeURIComponent(url.hash.slice(1))
    if (!targetHtml.includes(`id="${fragment}"`)) {
      failures.push(`${relative(filePath)} links to missing fragment ${href}`)
    }
  }
}

if (failures.length > 0) {
  throw new Error(
    `Documentation link verification failed (${failures.length}):\n${failures
      .slice(0, 50)
      .map((failure) => `- ${failure}`)
      .join(
        "\n",
      )}${failures.length > 50 ? `\n- ...and ${failures.length - 50} more` : ""}`,
  )
}

console.log(
  `Verified links in ${htmlByPath.size} generated documentation pages`,
)

async function htmlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = await Promise.all(
    entries.map((entry) => {
      const entryPath = path.join(directory, entry.name)
      if (entry.isDirectory()) return htmlFiles(entryPath)
      return entry.isFile() && entry.name === "index.html" ? [entryPath] : []
    }),
  )
  return files.flat()
}

async function loadHtml(filePath) {
  const cached = htmlByPath.get(filePath)
  if (cached !== undefined) return cached
  try {
    const html = await readFile(filePath, "utf8")
    htmlByPath.set(filePath, html)
    return html
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return undefined
    }
    throw error
  }
}

function relative(filePath) {
  return path.relative(staticRoot, filePath)
}
