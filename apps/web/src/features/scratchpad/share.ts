import * as Effect from "effect/Effect"
import { WorkspaceCompression } from "@/features/share/compression"
import { zipWorkspace } from "@/features/share/download"
import {
  fromFlatWorkspace,
  type FlatWorkspaceMetadata,
} from "@/features/share/flat"
import { ShortenClient } from "@/features/share/shorten/client"
import { ShortenError } from "@/features/share/shorten/domain"
import type { Workspace } from "@/features/share/workspace"
import type { WorkspaceSnapshot } from "./workspace.ts"

/** The page a Scratchpad Share opens on. */
export const SCRATCHPAD_PATH = "/scratchpad"

/**
 * The shortener's limit on the compressed text, in characters. Mirrors
 * `constMaxSize` in the server's `Shorten` service; checked here too so an
 * oversized Share fails before the request.
 */
export const SHARE_MAX_LENGTH = 128 * 1024

/** What a Share or an autosave is built from: Workspace contents + metadata. */
export interface ShareSource {
  readonly files: Readonly<Record<string, string>>
  readonly directories?: ReadonlyArray<string> | undefined
  readonly metadata?: FlatWorkspaceMetadata | undefined
}

/**
 * The share-format `Workspace` for the Scratchpad's current contents, in the
 * shape `/play` writes (`prepare: "pnpm install"`, no snapshots). Every file
 * is included, `package.json` and `pnpm-lock.yaml` among them.
 */
export const toShareWorkspace = (source: ShareSource): Workspace =>
  fromFlatWorkspace({
    files: source.files,
    directories: source.directories ?? [],
    metadata: source.metadata,
  }).withPrepare("pnpm install").withNoSnapshot

/** `toShareWorkspace` for a Workspace snapshot. */
export const shareSourceFromSnapshot = (
  snapshot: WorkspaceSnapshot,
  metadata: FlatWorkspaceMetadata | undefined,
): ShareSource => ({
  files: snapshot.files,
  directories: snapshot.directories,
  metadata,
})

/**
 * `WorkspaceCompression.compress` reads each file's live content through a
 * callback (the WebContainer on `/play`). The Scratchpad's tree already holds
 * the content, so the callback reads it back from the tree.
 */
const readFromTree = (workspace: Workspace) => {
  const byPath = new Map<string, string>()
  for (const [node, path] of workspace.filePaths) {
    if (node._tag === "File") {
      byPath.set(workspace.relativePath(path), node.initialContent)
    }
  }
  return (path: string) => Effect.succeed(byPath.get(path) ?? "")
}

/** Compresses a share-format Workspace into the text the shortener stores. */
export const compressShareWorkspace = Effect.fnUntraced(function* (
  workspace: Workspace,
) {
  const compression = yield* WorkspaceCompression
  return yield* compression.compress(workspace, readFromTree(workspace))
})

export interface ShareResult {
  readonly hash: string
  /** `/scratchpad#<hash>`, absolute when an `origin` is given. */
  readonly url: string
}

/**
 * Shares the Scratchpad: builds the share-format Workspace, compresses it and
 * stores it with the shortener. The hash opens on `/scratchpad` and `/play`.
 */
export const shareScratchpad = Effect.fnUntraced(function* (
  source: ShareSource,
  options: { readonly origin?: string | undefined } = {},
) {
  const client = yield* ShortenClient
  const compressed = yield* compressShareWorkspace(toShareWorkspace(source))
  if (compressed.length > SHARE_MAX_LENGTH) {
    return yield* new ShortenError({ reason: "TooLarge", method: "shorten" })
  }
  const hash = yield* client.shorten({ payload: { text: compressed } })
  const path = `${SCRATCHPAD_PATH}#${hash}`
  return {
    hash,
    url: options.origin === undefined ? path : `${options.origin}${path}`,
  } satisfies ShareResult
})

/**
 * The Scratchpad as a zip: the files a Share holds, under a folder named
 * after the Workspace, in `<Workspace name>.zip`.
 */
export const downloadScratchpad = (source: ShareSource) =>
  zipWorkspace(toShareWorkspace(source))

/** A message for a failed Share, shown next to the Share button. */
export const shareErrorMessage = (error: unknown): string => {
  if (error instanceof ShortenError && error.reason === "TooLarge") {
    return "This workspace is too large to share. Compressed, it must stay under 128 KB."
  }
  if (
    typeof error === "object" &&
    error !== null &&
    "_tag" in error &&
    (error._tag === "HttpClientError" || error._tag === "RequestError")
  ) {
    return "Couldn't reach the share service. Check your connection and try again."
  }
  return "Couldn't create a share link. Try again."
}
