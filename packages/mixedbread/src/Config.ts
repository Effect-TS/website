export const MAX_MIXEDBREAD_TEXT_LENGTH = 65_536
export const MAX_API_CHUNKS_PER_FILE = 250
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
  "*.mdx",
] as const

export interface PreviewSyncOptions {
  readonly kind: "preview"
  readonly pullRequest: number
  readonly revision: string
  readonly storeId: string
}

export interface ProductionSyncOptions {
  readonly kind: "production"
  readonly revision: string
  readonly storeId: string
}

export type SyncOptions = PreviewSyncOptions | ProductionSyncOptions
export type SyncScope = "all" | "markdown" | "api-reference"

export interface DeleteOptions {
  readonly pullRequest: number
}
