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
            try: () => ApiReference.moduleView(reflection),
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
          const chunks = declarations.map((declaration) => ({
            type: "text",
            text: declarationMarkdown({
              declaration,
              modulePath: entry.data.modulePath,
              packageName: entry.data.packageName,
              declarationHref: `${moduleHref}#${declaration.anchor}`,
            }),
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
            },
          }))
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

export function declarationMarkdown(options: {
  readonly declaration: ApiDeclaration
  readonly declarationHref: string
  readonly modulePath: string
  readonly packageName: string
}): string {
  const { declaration } = options
  const sections = [`# ${declaration.name}`]
  if (declaration.commentMarkdown !== undefined) {
    sections.push("", declaration.commentMarkdown)
  }
  sections.push(
    "",
    `Package: \`${options.packageName}\``,
    `Module: \`${options.modulePath}\``,
    `Kind: ${declaration.kind}`,
    `Category: ${declaration.category}`,
    `API reference: ${options.declarationHref}`,
  )
  if (declaration.since !== undefined)
    sections.push(`Since: ${declaration.since}`)
  if (declaration.signature !== undefined) {
    sections.push(
      "",
      "## Signature",
      "",
      "```typescript",
      declaration.signature,
      "```",
    )
  }
  for (const example of declaration.examples) {
    sections.push(
      "",
      `## ${example.title ?? "Example"}`,
      "",
      `\`\`\`${example.language}`,
      example.source,
      "```",
    )
  }
  return `${sections.join("\n")}\n`
}
