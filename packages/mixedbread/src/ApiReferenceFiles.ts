import { toFile } from "@mixedbread/sdk"
import * as Effect from "effect/Effect"
import {
  MAX_API_CHUNKS_PER_FILE,
  MAX_MIXEDBREAD_TEXT_LENGTH,
} from "./Config.ts"
import { UnknownError } from "./Error.ts"
import {
  ApiReference,
  type ApiDeclaration,
} from "@website/api-reference/ApiReference"
import { loadApiReferenceDataset } from "@website/api-reference/ApiReferenceDataset"
import { loadReflection } from "@website/api-reference/Reflection"
import { createReflectionSymbolResolver } from "@website/api-reference/ReflectionSymbolResolver"

export interface LocalFile {
  readonly externalId: string
  readonly fileHash: string
  readonly metadata: Readonly<Record<string, string>>
  readonly upload: () =>
    | ReturnType<typeof toFile>
    | Promise<ReturnType<typeof toFile>>
}

export const generateApiReferenceFiles = Effect.fn(
  "ApiReferenceFiles.generate",
)(function* (
  apiReferenceDir: string,
  hash: (bytes: Uint8Array) => Effect.Effect<string, UnknownError>,
) {
  const entries = yield* Effect.tryPromise({
    try: () => loadApiReferenceDataset(apiReferenceDir),
    catch: (cause) => new UnknownError({ cause }),
  })
  if (entries.length === 0) {
    return yield* new UnknownError({
      cause: new Error(`No API reference dataset found in ${apiReferenceDir}`),
    })
  }
  const packageFiles = yield* Effect.forEach(
    Map.groupBy(
      entries,
      (entry) => `${entry.data.version}/${entry.data.packageSlug}`,
    ),
    Effect.fnUntraced(function* ([, packageEntries]) {
      const packageEntry = packageEntries[0]
      if (packageEntry === undefined) {
        return yield* new UnknownError({
          cause: new Error("Empty API package group"),
        })
      }
      const resolveSymbolHref = createReflectionSymbolResolver(
        entries
          .filter(
            (candidate) => candidate.data.version === packageEntry.data.version,
          )
          .map((candidate) => candidate.data),
      )
      const nestedChunks = yield* Effect.forEach(
        packageEntries,
        Effect.fnUntraced(function* (entry) {
          const reflection = yield* Effect.tryPromise({
            try: () =>
              loadReflection(entry.data, {
                baseDirectory: apiReferenceDir,
              }),
            catch: (cause) => new UnknownError({ cause }),
          })
          const moduleView = yield* Effect.try({
            try: () =>
              ApiReference.moduleView(reflection, {
                moduleHref: (modulePath) => {
                  const target = packageEntries.find(
                    (candidate) => candidate.data.modulePath === modulePath,
                  )
                  return target === undefined
                    ? undefined
                    : `/docs/${target.data.version}/api/${target.data.packageSlug}/${target.data.modulePath}`
                },
                modulePath: entry.data.modulePath,
                resolveSymbolHref,
              }),
            catch: (cause) => new UnknownError({ cause }),
          })
          const declarations = moduleView.groups.flatMap(
            (group) => group.declarations,
          )
          if (
            new Set(declarations.map((declaration) => declaration.anchor))
              .size !== declarations.length
          ) {
            return yield* new UnknownError({
              cause: new Error(
                `Duplicate API declaration anchors in ${entry.id}`,
              ),
            })
          }
          const moduleName =
            entry.data.modulePath.split("/").at(-1) ?? entry.data.modulePath
          const moduleHref = `/docs/${entry.data.version}/api/${entry.data.packageSlug}/${entry.data.modulePath}`
          const chunks = declarations.flatMap((declaration) => {
            const texts = declarationChunkTexts({
              declaration,
              modulePath: entry.data.modulePath,
              packageName: entry.data.packageName,
              declarationHref: `${moduleHref}#${declaration.anchor}`,
            })
            return texts.map((text, index) => ({
              type: "text",
              text,
              mime_type: "text/plain",
              generated_metadata: {
                type: "text",
                declaration_anchor: declaration.anchor,
                declaration_kind: declaration.kind,
                declaration_name: declaration.name,
                module_href: moduleHref,
                module_name: moduleName,
                module_path: entry.data.modulePath,
                signature: (declaration.signature ?? "").slice(0, 8_000),
                ...(texts.length > 1
                  ? {
                      declaration_part: index + 1,
                      declaration_part_count: texts.length,
                    }
                  : {}),
              },
            }))
          })
          // Splitting keeps every chunk within the limit, so this only
          // fires if `declarationChunkTexts` itself is broken.
          if (
            chunks.some(
              (chunk) => chunk.text.length > MAX_MIXEDBREAD_TEXT_LENGTH,
            )
          ) {
            return yield* new UnknownError({
              cause: new Error(
                `API search chunk exceeds ${MAX_MIXEDBREAD_TEXT_LENGTH} characters in ${entry.id}`,
              ),
            })
          }
          return chunks
        }),
        { concurrency: 10 },
      )
      const chunks = nestedChunks.flat()
      const shards = Array.from(
        { length: Math.ceil(chunks.length / MAX_API_CHUNKS_PER_FILE) },
        (_, index) =>
          chunks.slice(
            index * MAX_API_CHUNKS_PER_FILE,
            (index + 1) * MAX_API_CHUNKS_PER_FILE,
          ),
      )
      return yield* Effect.forEach(shards, (shard, index) => {
        const suffix = String(index + 1).padStart(3, "0")
        const filename = `${packageEntry.data.packageSlug}-${suffix}.mxjson`
        const bytes = new TextEncoder().encode(JSON.stringify(shard))
        return hash(bytes).pipe(
          Effect.map(
            (fileHash) =>
              ({
                externalId: [
                  "api-reference",
                  packageEntry.data.version,
                  filename,
                ].join("/"),
                fileHash,
                metadata: {
                  api_version: packageEntry.data.version,
                  content_source: "api-reference",
                  package_name: packageEntry.data.packageName,
                  package_slug: packageEntry.data.packageSlug,
                },
                upload: () =>
                  toFile(bytes, filename, {
                    type: "application/vnd-mxbai.chunks-json",
                  }),
              }) satisfies LocalFile,
          ),
        )
      })
    }),
    { concurrency: 10 },
  )
  return packageFiles.flat()
})

interface DeclarationMarkdownOptions {
  readonly declaration: ApiDeclaration
  readonly declarationHref: string
  readonly modulePath: string
  readonly packageName: string
}

type DeclarationSection =
  | { readonly _tag: "Prose"; readonly text: string }
  | {
      readonly _tag: "Code"
      readonly heading: string
      readonly language: string
      readonly source: string
    }

function metadataLines(options: DeclarationMarkdownOptions): Array<string> {
  const { declaration } = options
  const lines = [
    `Package: \`${options.packageName}\``,
    `Module: \`${options.modulePath}\``,
    `Kind: ${declaration.kind}`,
    `Category: ${declaration.category}`,
    `API reference: ${options.declarationHref}`,
  ]
  if (declaration.since !== undefined) lines.push(`Since: ${declaration.since}`)
  return lines
}

function bodySections(declaration: ApiDeclaration): Array<DeclarationSection> {
  const sections: Array<DeclarationSection> = []
  if (declaration.commentMarkdown !== undefined) {
    sections.push({ _tag: "Prose", text: declaration.commentMarkdown })
  }
  if (declaration.signature !== undefined) {
    sections.push({
      _tag: "Code",
      heading: "Signature",
      language: "typescript",
      source: declaration.signature,
    })
  }
  for (const example of declaration.examples) {
    sections.push({
      _tag: "Code",
      heading: example.title ?? "Example",
      language: example.language,
      source: example.source,
    })
  }
  return sections
}

export function declarationMarkdown(
  options: DeclarationMarkdownOptions,
): string {
  const lines = [`# ${options.declaration.name}`]
  const sections = bodySections(options.declaration)
  const prose = sections.filter((section) => section._tag === "Prose")
  for (const section of prose) lines.push("", section.text)
  lines.push("", ...metadataLines(options))
  for (const section of sections) {
    if (section._tag === "Code") {
      lines.push(
        "",
        `## ${section.heading}`,
        "",
        `\`\`\`${section.language}`,
        section.source,
        "```",
      )
    }
  }
  return `${lines.join("\n")}\n`
}

/**
 * Renders a declaration as one or more search chunks of at most `maxLength`
 * characters each. Declarations that fit are rendered exactly like
 * `declarationMarkdown`. Larger ones are split into parts that each repeat a
 * short header (name, package, module, link) and carry the next slice of the
 * body, so no content is dropped.
 */
export function declarationChunkTexts(
  options: DeclarationMarkdownOptions,
  maxLength: number = MAX_MIXEDBREAD_TEXT_LENGTH,
): ReadonlyArray<string> {
  const whole = declarationMarkdown(options)
  if (whole.length <= maxLength) return [whole]

  const meta = metadataLines(options).join("\n")
  const header = (part: number | string, count: number | string) =>
    `# ${options.declaration.name} (part ${part} of ${count})\n\n${meta}`
  // Reserve room for part numbers of any realistic size.
  const headerLength = header("999999", "999999").length
  // Each block is preceded by a blank line, and the chunk ends with "\n".
  const available = maxLength - headerLength - 3

  const blocks: Array<string> = []
  for (const section of bodySections(options.declaration)) {
    if (section._tag === "Prose") {
      for (const fragment of splitText(section.text, available)) {
        blocks.push(fragment)
      }
      continue
    }
    const open = (continued: boolean) =>
      `## ${section.heading}${continued ? " (continued)" : ""}\n\n\`\`\`${section.language}\n`
    const close = "\n```"
    const budget = available - open(true).length - close.length
    splitText(section.source, budget).forEach((fragment, index) => {
      blocks.push(`${open(index > 0)}${fragment.replace(/\n$/, "")}${close}`)
    })
  }

  const groups: Array<Array<string>> = []
  let current: Array<string> = []
  let currentLength = 0
  for (const block of blocks) {
    const length = block.length + 2
    if (current.length > 0 && currentLength + length > available + 2) {
      groups.push(current)
      current = []
      currentLength = 0
    }
    current.push(block)
    currentLength += length
  }
  if (current.length > 0) groups.push(current)

  return groups.map(
    (group, index) =>
      `${header(index + 1, groups.length)}${group.map((block) => `\n\n${block}`).join("")}\n`,
  )
}

/**
 * Splits `text` into consecutive fragments of at most `budget` characters
 * whose concatenation is exactly `text`. Prefers to cut after a newline and
 * never cuts a UTF-16 surrogate pair in half.
 */
export function splitText(text: string, budget: number): Array<string> {
  if (budget < 2) {
    throw new Error(`Cannot split text into fragments of ${budget} characters`)
  }
  const fragments: Array<string> = []
  let position = 0
  while (text.length - position > budget) {
    const newline = text.lastIndexOf("\n", position + budget - 1)
    let cut = newline >= position ? newline + 1 : position + budget
    const code = text.charCodeAt(cut - 1)
    if (newline < position && code >= 0xd800 && code <= 0xdbff) cut -= 1
    fragments.push(text.slice(position, cut))
    position = cut
  }
  if (position < text.length || fragments.length === 0) {
    fragments.push(text.slice(position))
  }
  return fragments
}
