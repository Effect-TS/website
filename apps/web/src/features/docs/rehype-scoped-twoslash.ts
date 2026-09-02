import type { Element, Root } from "hast"

/**
 * Removes the `twoslash` token from code fence meta so the
 * `expressive-code-twoslash` plugin only type-checks blocks that belong to the
 * scoped docs folders.
 *
 * Expressive Code plugins have no per-file awareness and process every block
 * whose meta contains the `twoslash` token. Only the v4 guides snippets are
 * written against the current `effect` types — v3 docs and blog posts predate
 * them — so the token is stripped everywhere else. The plugin must run before
 * the Expressive Code rehype plugin, which is appended after the rehype plugins
 * configured in `astro.config.ts`.
 */

/** Docs folders whose `twoslash` blocks are type-checked at build time. */
const TWOSLASH_SCOPES: Array<RegExp> = [/docs[/\\]v4[/\\]guides[/\\]/]

const HAS_TWOSLASH = /\btwoslash\b/
const TWOSLASH_TOKEN = /(?<=^|\s)twoslash(?=\s|$)/g

/** Minimal shape of the VFile passed to unified transformers. */
interface VFileLike {
  readonly path?: string | undefined
  readonly history?: ReadonlyArray<string> | undefined
}

export function rehypeScopedTwoslash() {
  return (tree: Root, file: VFileLike) => {
    if (isScoped(file)) return
    stripTwoslashMeta(tree)
  }
}

function isScoped(file: VFileLike): boolean {
  // Unknown path: err on the side of disabling twoslash.
  const path = file.path ?? file.history?.[0]
  if (path === undefined) return false
  return TWOSLASH_SCOPES.some((scope) => scope.test(path))
}

function stripTwoslashMeta(parent: Root | Element): void {
  for (const child of parent.children) {
    if (child.type !== "element") continue
    if (child.tagName === "code") {
      stripCodeMeta(child)
    }
    stripTwoslashMeta(child)
  }
}

/**
 * The fence info string (without the language) lives in `data.meta` for code
 * blocks produced from markdown; `properties.metastring` is checked as well to
 * cover blocks that bypass remark-rehype.
 */
function stripCodeMeta(code: Element): void {
  if (code.data?.meta !== undefined) {
    const meta = stripToken(String(code.data.meta))
    if (meta !== code.data.meta) {
      code.data = { ...code.data, meta }
    }
  }
  if (typeof code.properties?.metastring === "string") {
    const meta = stripToken(code.properties.metastring)
    if (meta !== code.properties.metastring) {
      code.properties.metastring = meta
    }
  }
}

function stripToken(meta: string): string {
  if (!HAS_TWOSLASH.test(meta)) return meta
  return meta
    .replace(TWOSLASH_TOKEN, "")
    .replace(/\s{2,}/g, " ")
    .trim()
}
