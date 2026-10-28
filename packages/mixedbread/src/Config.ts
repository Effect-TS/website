export const MAX_MIXEDBREAD_TEXT_LENGTH = 65_536
export const MAX_CHUNKS_PER_FILE = 250
// Chunks stay near the embedding model's context so each release is one hit.
export const MAX_CHANGELOG_CHUNK_LENGTH = 2_000
// Docs and blog chunks follow the same budget as changelog chunks.
export const MAX_MARKDOWN_CHUNK_LENGTH = MAX_CHANGELOG_CHUNK_LENGTH
export const CHANGELOG_INDEX_CHANNELS = ["v4"] as const
export const UPLOAD_CONCURRENCY = 100
export const FILE_UPLOAD_ATTEMPTS = 3
export const DEFAULT_DOCUMENTATION_DIRECTORY = "apps/web/src/content/docs"
export const DEFAULT_BLOG_DIRECTORY = "apps/web/src/content/blog"
export const DEFAULT_API_REFERENCE_DIRECTORY = "apps/web/.data/api-reference"
export const BLOG_CONTENT_PATTERNS = [
  "cause-and-effect/*.mdx",
  "this-week-in-effect/*/index.mdx",
  "releases/effect/*.mdx",
  "releases/schema/*.mdx",
  "releases/*.mdx",
  "module-of-the-week/*/index.mdx",
  "*.mdx",
] as const

export interface PreviewSyncOptions {
  readonly kind: "preview"
  readonly pullRequest: number
  readonly revision: string
  readonly storeId: string
  readonly wait?: boolean
}

export interface ProductionSyncOptions {
  readonly kind: "production"
  readonly revision: string
  readonly storeId: string
  readonly wait?: boolean
}

export type SyncOptions = PreviewSyncOptions | ProductionSyncOptions
export type SyncScope = "all" | "markdown" | "api-reference"

export interface DeleteOptions {
  readonly pullRequest: number
}
