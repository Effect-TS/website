import { toFile } from "@mixedbread/sdk"
import { loadChangelogDataset } from "@website/api-reference/Changelog"
import { changelogHref, type ChangelogPackage } from "@website/domain/Changelog"
import * as Effect from "effect/Effect"
import type { LocalFile } from "./ApiReferenceFiles.ts"
import {
  CHANGELOG_INDEX_CHANNELS,
  MAX_CHANGELOG_CHUNK_LENGTH,
  MAX_CHANGELOG_CHUNKS_PER_FILE,
} from "./Config.ts"
import { UnknownError } from "./Error.ts"

export interface ChangelogChunk {
  readonly type: "text"
  readonly text: string
  readonly mime_type: "text/plain"
  readonly generated_metadata: {
    readonly type: "text"
    readonly page_href: string
    readonly version: string
  }
}

// Changesets prefixes every entry with PR, commit and author links.
const ENTRY_PREFIX =
  /^(\s*-\s+)(?:\[#\d+\]\([^)]*\)\s+)?(?:\[`[0-9a-f]{7,40}`\]\([^)]*\)\s+)?(?:Thanks (?:\[@[\w-]+\]\([^)]*\)|@[\w-]+)!\s+-\s+)?/

/**
 * Release text worth embedding: no commit-link boilerplate and no
 * "Updated dependencies" lists. Returns "" when nothing else remains.
 */
export function searchBody(body: string): string {
  const lines: Array<string> = []
  let skipping = false
  for (const line of body.split("\n")) {
    if (/^- Updated dependencies/.test(line)) {
      skipping = true
      continue
    }
    if (skipping && /^\s+\S/.test(line)) continue
    skipping = false
    lines.push(line.replace(ENTRY_PREFIX, "$1"))
  }
  return lines
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .split(/^(?=###\s)/m)
    .filter((section) => section.replace(/^###.*$/m, "").trim() !== "")
    .join("")
    .trim()
}

/** Split text at line boundaries into parts of at most `limit` characters. */
export function splitText(text: string, limit: number): Array<string> {
  const parts: Array<string> = []
  let current = ""
  const flush = () => {
    if (current.trim() !== "") parts.push(current.trim())
    current = ""
  }
  for (const line of text.split("\n")) {
    let rest = line
    while (rest.length > limit) {
      const space = rest.lastIndexOf(" ", limit)
      const cut = space > 0 ? space : limit
      flush()
      parts.push(rest.slice(0, cut).trim())
      rest = rest.slice(cut)
    }
    if (current.length + rest.length + 1 > limit) flush()
    current += `${rest}\n`
  }
  flush()
  return parts
}

/** One chunk per release part, oldest release first. */
export function releaseChunks(
  changelog: ChangelogPackage,
): Array<ChangelogChunk> {
  const pageHref = changelogHref(changelog.channel, changelog.slug)
  return changelog.releases.toReversed().flatMap((release) => {
    const text = searchBody(release.body)
    if (text === "") return []
    const heading = `# ${changelog.name} ${release.version}\n\n`
    return splitText(text, MAX_CHANGELOG_CHUNK_LENGTH - heading.length - 1).map(
      (part) => ({
        type: "text" as const,
        text: `${heading}${part}\n`,
        mime_type: "text/plain" as const,
        generated_metadata: {
          type: "text" as const,
          page_href: pageHref,
          version: release.version,
        },
      }),
    )
  })
}

/**
 * Shards fill oldest first, so a new release only changes the newest shard and
 * every other file keeps its hash.
 */
export function shardChunks<A>(
  chunks: ReadonlyArray<A>,
  size: number = MAX_CHANGELOG_CHUNKS_PER_FILE,
): Array<ReadonlyArray<A>> {
  return Array.from({ length: Math.ceil(chunks.length / size) }, (_, index) =>
    chunks.slice(index * size, (index + 1) * size),
  )
}

export const generateChangelogFiles = Effect.fn("ChangelogFiles.generate")(
  function* (
    apiReferenceDir: string,
    hash: (bytes: Uint8Array) => Effect.Effect<string, UnknownError>,
  ) {
    const entries = yield* Effect.tryPromise({
      try: () => loadChangelogDataset(apiReferenceDir),
      catch: (cause) => new UnknownError({ cause }),
    })
    const files = yield* Effect.forEach(
      entries.filter(({ data }) =>
        CHANGELOG_INDEX_CHANNELS.some((channel) => channel === data.channel),
      ),
      Effect.fnUntraced(function* ({ data }) {
        const shards = shardChunks(releaseChunks(data))
        return yield* Effect.forEach(shards, (shard, index) => {
          const filename = `${data.slug}-changelog-${String(index + 1).padStart(3, "0")}.mxjson`
          const bytes = new TextEncoder().encode(JSON.stringify(shard))
          return hash(bytes).pipe(
            Effect.map(
              (fileHash) =>
                ({
                  externalId: ["api-reference", data.channel, filename].join(
                    "/",
                  ),
                  fileHash,
                  metadata: {
                    channel: data.channel,
                    content_source: "changelog",
                    package_name: data.name,
                    package_slug: data.slug,
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
    return files.flat()
  },
)
