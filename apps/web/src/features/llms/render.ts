import type { LlmsScope, LlmsSection } from "./domain"

const DESCRIPTION_LIMIT = 300

const ROOT_TITLE = "Effect"
const ROOT_SUMMARY =
  "Effect is a TypeScript library for building robust, type-safe applications. These files list the website content in markdown for LLMs and coding agents."

const oneLine = (text: string): string => {
  const flat = text.replaceAll(/\s+/g, " ").trim()
  return flat.length > DESCRIPTION_LIMIT
    ? `${flat.slice(0, DESCRIPTION_LIMIT - 1).trimEnd()}…`
    : flat
}

const header = (title: string, summary: string): string =>
  `# ${title}\n\n> ${summary}\n`

const absolute = (site: URL, path: string): string => new URL(path, site).href

export const renderRootIndex = (
  scopes: ReadonlyArray<LlmsScope>,
  site: URL,
): string => {
  const entries = scopes.map(
    (scope) =>
      `- [${scope.title}](${absolute(site, `${scope.path}/llms.txt`)}): ${oneLine(scope.summary)} Full content: [llms-full.txt](${absolute(site, `${scope.path}/llms-full.txt`)})`,
  )
  return [
    header(ROOT_TITLE, ROOT_SUMMARY),
    `Full content of the main scopes: [llms-full.txt](${absolute(site, "/llms-full.txt")})\n`,
    "## Scopes\n",
    ...entries,
    "",
  ].join("\n")
}

export const renderScopeIndex = (
  scope: LlmsScope,
  sections: ReadonlyArray<LlmsSection>,
  site: URL,
): string => {
  const blocks = sections
    .filter((section) => section.pages.length > 0)
    .map((section) => {
      const links = section.pages.map(
        (page) =>
          `- [${page.title}](${absolute(site, `${page.path}.md`)})${page.description ? `: ${oneLine(page.description)}` : ""}`,
      )
      return `## ${section.title}\n\n${links.join("\n")}\n`
    })
  return [
    header(scope.title, scope.summary),
    `Full content in one file: [llms-full.txt](${absolute(site, `${scope.path}/llms-full.txt`)})\n`,
    ...blocks,
  ].join("\n")
}

export const renderScopeFull = (
  scope: LlmsScope,
  sections: ReadonlyArray<LlmsSection>,
  site: URL,
): string => {
  const blocks = sections
    .flatMap((section) => section.pages)
    .map((page) => {
      const meta = [
        `title: ${JSON.stringify(page.title)}`,
        ...(page.description
          ? [`description: ${JSON.stringify(oneLine(page.description))}`]
          : []),
        `source: ${absolute(site, page.path)}`,
      ]
      return `---\n${meta.join("\n")}\n---\n\n${page.markdown().trim()}\n`
    })
  return [header(scope.title, scope.summary), ...blocks].join("\n")
}

export const renderRootFull = (scopeFiles: ReadonlyArray<string>): string =>
  [header(ROOT_TITLE, ROOT_SUMMARY), ...scopeFiles].join("\n")
