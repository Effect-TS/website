/**
 * Converts MDX docs sources into plain markdown, served statically by
 * appending `.md` to any docs page URL (see
 * `src/pages/docs/[version]/[...markdown].ts`).
 *
 * The transformation is purely textual and code-fence aware:
 *
 * - frontmatter never reaches this module (content entries expose the parsed
 *   body already), and top-level import statements are removed - imports
 *   inside code fences are left untouched
 * - `<Aside type="..." title="...">` becomes a blockquote with a bold label
 * - `<TabItem label="...">` becomes a bold label followed by its content,
 *   `<Tabs>` wrappers are removed
 * - `<Steps>` wrappers are unwrapped (their ordered lists remain)
 * - `<Badge text="..." />` becomes bold text
 * - code fence info strings are reduced to just the language, dropping
 *   website-specific metadata (`twoslash`, `import.meta.vitest`,
 *   line numbers/highlight directives, ...)
 */

const ASIDE_DEFAULT_LABELS: Record<string, string> = {
  note: "Note",
  tip: "Tip",
  caution: "Caution",
  danger: "Danger",
}

export interface DocsPageMarkdownInput {
  readonly title: string
  readonly body: string
}

/** Renders a docs page (title + transformed body) as plain markdown. */
export function docsPageToMarkdown(input: DocsPageMarkdownInput): string {
  return `# ${input.title}\n\n${docsBodyToMarkdown(input.body)}`
}

/** Transforms an MDX body (frontmatter excluded) into plain markdown. */
export function docsBodyToMarkdown(body: string): string {
  // Component blocks may wrap code fences, so they are transformed on the
  // whole document before it gets segmented by fences. Component tags never
  // occur inside code fences in these sources.
  const normalized = normalizeFenceInfoStrings(body)
  const blocked = transformBlocks(normalized)

  const output = splitFenceSegments(blocked)
    .map((segment) =>
      segment.kind === "fence" ? segment.text : transformProse(segment.text),
    )
    .join("\n")
    // Collapse blank runs left behind by removed tags and imports.
    .replaceAll(/\n{3,}/g, "\n\n")

  return `${output.trim()}\n`
}

/**
 * Derives the `.md` slug of a docs entry id, mirroring the page route's
 * `entry.id.replace(/\/index$/, "")`.
 */
export function markdownSlugForDocId(id: string): string {
  return `${id.replace(/\/index$/, "")}.md`
}

// ---------------------------------------------------------------------------
// Code fence segmentation
// ---------------------------------------------------------------------------

interface FenceSegment {
  readonly kind: "fence"
  readonly text: string
}

interface ProseSegment {
  readonly kind: "prose"
  readonly text: string
}

type Segment = FenceSegment | ProseSegment

interface FenceMarker {
  readonly char: string
  readonly length: number
}

/**
 * Splits source into alternating prose and code fence segments. Fence content
 * is preserved verbatim except for the opening line, whose info string is
 * reduced to the language.
 */
export function splitFenceSegments(source: string): Array<Segment> {
  const segments: Array<Segment> = []
  let prose: string[] = []
  let fence: { marker: FenceMarker; lines: string[] } | undefined

  const flushProse = () => {
    if (prose.length > 0) {
      segments.push({ kind: "prose", text: prose.join("\n") })
      prose = []
    }
  }

  for (const line of source.split("\n")) {
    if (fence === undefined) {
      const marker = matchFenceOpen(line)
      if (marker === undefined) {
        prose.push(line)
        continue
      }
      flushProse()
      fence = { marker, lines: [normalizeFenceOpen(line)] }
      continue
    }
    fence.lines.push(line)
    if (matchFenceClose(line, fence.marker)) {
      segments.push({ kind: "fence", text: fence.lines.join("\n") })
      fence = undefined
    }
  }

  // Unterminated fence: keep the remainder verbatim.
  if (fence !== undefined) {
    segments.push({ kind: "fence", text: fence.lines.join("\n") })
  }
  flushProse()

  return segments
}

/**
 * Walks the source with fence state and reduces every opening fence line's
 * info string to just the language. Fence content is left untouched.
 */
function normalizeFenceInfoStrings(source: string): string {
  const lines: Array<string> = []
  let fence: FenceMarker | undefined

  for (const line of source.split("\n")) {
    if (fence === undefined) {
      const marker = matchFenceOpen(line)
      if (marker === undefined) {
        lines.push(line)
        continue
      }
      fence = marker
      lines.push(normalizeFenceOpen(line))
      continue
    }
    lines.push(line)
    if (matchFenceClose(line, fence)) {
      fence = undefined
    }
  }

  return lines.join("\n")
}

function matchFenceOpen(line: string): FenceMarker | undefined {
  const match = /^[ \t]{0,3}(`{3,}|~{3,})/.exec(line)
  if (match === null) {
    return undefined
  }
  const marker = match[1]!
  return { char: marker.charAt(0), length: marker.length }
}

function matchFenceClose(line: string, marker: FenceMarker): boolean {
  const escaped = marker.char.replaceAll(/[$()*+.?[\\\]^{|}]/g, "\\$&")
  return new RegExp(`^[ \\t]{0,3}${escaped}{${marker.length},}[ \\t]*$`).test(
    line,
  )
}

function normalizeFenceOpen(line: string): string {
  const match = /^([ \t]{0,3})(`{3,}|~{3,})[ \t]*([^\s`~]*)/.exec(line)
  if (match === null) {
    return line
  }
  const [, indent, marker, language] = match
  return language === ""
    ? `${indent}${marker}`
    : `${indent}${marker}${language}`
}

// ---------------------------------------------------------------------------
// Block & prose transforms
// ---------------------------------------------------------------------------

/** Block-level components, applied to the whole document. */
function transformBlocks(text: string): string {
  let output = transformAsides(text)
  output = transformTabItems(output)
  output = unwrapTags(output, ["Tabs", "Steps"])
  return output
}

/** Prose-only transforms, applied outside of code fences. */
function transformProse(text: string): string {
  let output = removeImports(text)
  output = transformBadges(output)
  return output
}

/**
 * Removes top-level import statements. Only single-line statements occur in
 * these sources; multi-line imports would have to be handled here as well.
 */
function removeImports(text: string): string {
  return text
    .replace(
      /^[ \t]*import\s+(?:type\s+)?[\w$*{},\s]+?\s+from\s*["'][^"']+["'];?[ \t]*$/gm,
      "",
    )
    .replace(/^[ \t]*import\s*["'][^"']+["'];?[ \t]*$/gm, "")
}

function transformAsides(text: string): string {
  return text.replace(
    /^([ \t]*)<Aside\b([^>]*)>([\s\S]*?)<\/Aside>/gm,
    (_match, indent: string, attrsRaw: string, inner: string) => {
      const attrs = parseAttrs(attrsRaw)
      const label =
        attrs.title !== undefined && attrs.title !== ""
          ? attrs.title
          : (ASIDE_DEFAULT_LABELS[attrs.type ?? ""] ??
            ASIDE_DEFAULT_LABELS.note!)
      const quote = blockquote(dedent(inner).trim(), indent)
      return `${indent}> **${label}**\n${indent}>\n${quote}`
    },
  )
}

function transformTabItems(text: string): string {
  return text.replace(
    /^([ \t]*)<TabItem\b([^>]*)>([\s\S]*?)<\/TabItem>/gm,
    (_match, indent: string, attrsRaw: string, inner: string) => {
      const label = parseAttrs(attrsRaw).label?.trim() ?? ""
      // Re-apply the tag's indentation so tab content nested in a list item
      // stays within that list item.
      const content = dedent(inner)
        .trim()
        .split("\n")
        .map((line) => (line === "" ? "" : `${indent}${line}`))
        .join("\n")
      return `${indent}**${label}**\n\n${content}`
    },
  )
}

function unwrapTags(text: string, tags: Array<string>): string {
  let output = text
  for (const tag of tags) {
    output = output
      .replace(new RegExp(`^[ \\t]*<${tag}\\b[^>]*>[ \\t]*$`, "gm"), "")
      .replace(new RegExp(`^[ \\t]*</${tag}>[ \\t]*$`, "gm"), "")
  }
  return output
}

function transformBadges(text: string): string {
  return text.replace(
    /<Badge\b[^>]*?text=("|')([^"']*?)\1[^>]*?>/g,
    (_match, _quote, value: string) => `**${value.trim()}**`,
  )
}

function parseAttrs(raw: string): Record<string, string> {
  const attrs: Record<string, string> = {}
  const pattern = /([\w$-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|\{([^}]*)\})/g
  for (const match of raw.matchAll(pattern)) {
    attrs[match[1]!] = (match[2] ?? match[3] ?? match[4] ?? "").trim()
  }
  return attrs
}

/** Strips the common indentation from every non-blank line. */
function dedent(block: string): string {
  const lines = block.split("\n")
  let minIndent = Number.POSITIVE_INFINITY
  for (const line of lines) {
    if (line.trim() === "") {
      continue
    }
    minIndent = Math.min(minIndent, /^[ \t]*/.exec(line)![0].length)
  }
  if (!Number.isFinite(minIndent) || minIndent === 0) {
    return block
  }
  return lines.map((line) => line.slice(minIndent)).join("\n")
}

function blockquote(content: string, indent: string): string {
  return content
    .split("\n")
    .map((line) => (line === "" ? `${indent}>` : `${indent}> ${line}`))
    .join("\n")
}
